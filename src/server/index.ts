import { Hono } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'
//import { serveStatic } from "@hono/node-server/serve-static"
//import { renderToString } from 'vue/server-renderer'
//import { createApp } from './main'
import { HTTPException } from 'hono/http-exception'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'

import { getConnInfo } from 'hono/cloudflare-workers'

import { googleAuth } from '@hono/oauth-providers/google'
import type { GoogleUser } from '@hono/oauth-providers/google'

import { v4 } from 'uuid'

import type { Token } from './models/types'
import { useUserModel } from './models/user'
import { useSessionModel } from './models/session'

type Bindings = {
  DB: D1Database,
  GOOGLE_CLIENT_ID: string,
  GOOGLE_CLIENT_SECRET: string,
  GOOGLE_OAUTH_SCOPE: string,
  JWT_SECRET: string,
}

type Variables = {
  token: Token,
  'refresh-token'?: Token,
  'user-google'?: Partial<GoogleUser>,
  'granted-scopes'?: string[]
}

const inProduction = import.meta.env.MODE === 'production'

import api from './routes/api'

const app = new Hono<{Bindings: Bindings}>()

app.onError((err, c) => {
  const status = ('getResponse' in err ? err.getResponse().status:500) as StatusCode
  if (c.req.header('accept') == "application/json"){
    if ('getResponse' in err){
      const r = err.getResponse()
      const w = r.headers.get('www-authenticate')
      if (w){
        c.header('WWW-Authenticate', w)
      }
    }
    return c.json({error: true, message: err.message}, status)
  }

  return c.text(err.message, status)
})

app.route('/api', api)

const auth = new Hono<{Bindings: Bindings, Variables: Variables}>()

auth.use('/google', (c, next) => {
  const nextRedirect = c.req.query('to') || '/'
  //@ts-ignore
  setCookie(c, 'rTo', nextRedirect, {maxAge: 600, httpOnly: true, path: '/google'})

  const gAuth = googleAuth({
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/contacts'
    ]
  })

  return gAuth(c, next)
})

auth.get('/google', async c => {
  const token = c.get('token')
  const grantedScopes = c.get('granted-scopes')
  const googleUser = c.get('user-google')

  if (!googleUser){
    throw new HTTPException(401, {message: `Cannot fetch your google account!`})
  }

  const userModel = useUserModel(c.env.DB)
  let user = await userModel.findOneBy({email: googleUser.email})
  if ( !user){
    try {
      user = await userModel.save({
        role: 'subscriber',
        email: googleUser.email,
        name: googleUser.name,
        password: null,
        status: 1,
        registeredAt: new Date(),
        updatedAt: new Date(),
        picture: googleUser.picture,
        registeredVia: 'google'
      })
    } catch (err: any){
      throw new HTTPException(400, {message: err.message})
    }

    if (!user){
      throw new HTTPException(401, {message: `No user found with your google account!`})
    }
  }

  //@ts-ignore
  const connInfo = getConnInfo(c)
  const sessionModel = useSessionModel(c.env.DB)
  //@ts-ignore
  const sessionId = getCookie(c, 'prgSession')

  try {
    const session = await sessionModel.save({
      id: sessionId,
      userId: user.id,
      status: true,
      userAgent: c.req.header('user-agent'),
      ip: connInfo.remote.address,
      expiredAt: Math.floor(Date.now()/1e3) + (10 * 24 * 3600),
      authProvider: 'google',
      authToken: {
        token: token,
        'refresh-token': c.get('refresh-token'),
        'granted-scopes': grantedScopes,
        expiredAt: Math.floor(Date.now()/1e3) + (token.expires_in || 3600)
      }
    })
    if (!session){
      throw new Error(`Cannot save your session. Please try again later.`)
    }

    //@ts-ignore
    let to = c.req.query('to') || getCookie(c, 'rTo') || '/'

    if ( !sessionId){
      const code = v4()

      const payload = {
        sessionId: session.id,
        exp: Math.floor(Date.now() / 1e3) + 600
      }

      const jwtToken = await sign(payload, c.env.JWT_SECRET)

      //@ts-ignore
      setCookie(c, code, jwtToken, {
        maxAge: 600,
        httpOnly: true,
        path: '/',
        secure: inProduction
      })

      to = `/authenticated?to=${to}&code=${code}`
    }

    //@ts-ignore
    deleteCookie(c, 'rTo')

    return c.redirect(to)
  } catch (err: any){
    throw new HTTPException(400, {message: err.message})
  }
})

auth.post('/token', async c => {
  const responsePayload: {
    error?: boolean,
    message?: string,
    accessToken?: string,
    status: StatusCode
  } = {
    message: 'Not Authorized! Invalid authorization code.',
    status: 401
  }

  const reqBody = await c.req.json<{code?: string}>()
  if ('code' in reqBody && reqBody.code){
    //@ts-ignore
    const jwtToken = getCookie(c, reqBody.code)

    if (jwtToken){
      try {
        const jwtPayload = (await verify(jwtToken, c.env.JWT_SECRET)) as {sessionId?: string, exp?: number}
        if (jwtPayload.sessionId){
          const sessionModel = useSessionModel(c.env.DB)
          const session = await sessionModel.find(jwtPayload.sessionId)
          if (session && session.userId){
            const userModel = useUserModel(c.env.DB)
            const user = await userModel.find(session.userId)
            if (user && user.status){
              const tokenPayload = {
                sessionId: session.id,
                user: {
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  picture: user.picture
                },
                exp: session.expiredAt || (Math.floor(Date.now()/1e3) + 10 * 24 * 3600)
              }

              //@ts-ignore
              setCookie(c, 'prgSession', session.id, {maxAge: 10 * 24 * 3600, httpOnly: true, path: '/'})

              responsePayload.accessToken = await sign(tokenPayload, c.env.JWT_SECRET)
              responsePayload.message = "Access Token has been created"
              responsePayload.status = 200

              //@ts-ignore
              deleteCookie(c, reqBody.code)

              return c.json(responsePayload)
            }
          }
        }
      } catch (err: any){
        console.error(err)
        if ("name" in err && !(new String(err.name)).startsWith('JwtToken')){
          responsePayload.message = err.message
          responsePayload.status = 500
        }
      }
    }
  }

  responsePayload.error = true
  return c.json(responsePayload, responsePayload.status)
})

app.route('/auth', auth)

/*
app.use("/*", serveStatic({
  root: "./public/",
  rewriteRequestPath(path) {
    console.log('from serveStatic middleware')
    console.log(path)
    return path
  },
}))
*/

app.use((c, next) => {
  c.setRenderer((content) => {
    return c.html(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>PerigiWeb</title>
      </head>
      <body>
        <div id="app">${content}</div>
        <script type="module" src="/src/client/index.ts"></script>
      </body>
    </html>`)
  })
  return next()
})

app.get('/conn-info', async c => {
  const info = c.req.header()

  return c.json(info)
})

app.get('/test-db', async c => {
  try {
    const sm = useSessionModel(c.env.DB)
    const r = await sm.findBy()
    //console.log(r)
    //const r = await c.env.DB.prepare("PRAGMA table_info(s3_providers)").all()
    //const r = await c.env.DB.exec(`ALTER TABLE users ADD COLUMN registeredVia character varying(255) NULL`)
    return c.json(r)
    //const r = await c.env.DB.prepare("DELETE FROM users WHERE name=?").bind('almuth@perigi.my.id').run()
    //const r = await c.env.DB.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
    //CREATE INDEX IF NOT EXISTS idx_users_registered_at ON users(registeredAt);`)
    //console.log(r)
    //const info = await c.env.DB.prepare("PRAGMA index_list(users)").all()
    /*const userModel = useUserModel(c.env.DB)
    try {
      const user = await userModel.save({
        //id: "7eff9104-791b-42e5-94ea-048c76989fe8",
        newPassword: "1234qwe",
        role: 'admin',
        email: 'admin@perigi.my.id',
        //password: null,
        name: 'Super Ngadimin',
        status: 1,
        //registeredAt: new Date(),
        //updatedAt: new Date()
      })

      return c.json({success: true, user})
    } catch (err: any){
      throw new HTTPException(400, {message: err.message})
    }*/
    const users = await c.env.DB.prepare("SELECT * FROM sessions").all()
    //const r = await userModel.findOneById('428a0593-0a71-416b-8dfa-f304182fdd4e')
    //console.log(users)
    return c.json(users)
  } catch (err: any){
    return c.json({errType: typeof err, m: err.message})
  }
})

app.get('/*', async (c) => {
  const html = '' //await renderToString(createApp())

  //return c.html(templateHtml.replace('<!--ssr-html-->', html))
  return c.render('Please wait...')
})

export default app
