import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { jwt } from 'hono/jwt'
import type { GoogleUser } from '../../../lib/oauth/providers/google'

import { refreshToken, revokeToken } from '../../../lib/oauth/providers/google'
import { GoogleContact } from '../../../lib/google/contact'

import { useSessionModel } from '../../models/session'
import type { Session, SessionOAuthToken } from '../../models/types'

import s3 from './s3'

type Bindings = {
  DB: D1Database,
  GOOGLE_ID: string,
  GOOGLE_SECRET: string,
  GOOGLE_SCOPES: string,
  JWT_SECRET: string,
}

type Variables = {
  session: Session,
  'token-google': SessionOAuthToken,
  'user-google': Partial<GoogleUser>,
  'granted-scopes': string[]
}

const api = new Hono<{Bindings: Bindings, Variables: Variables}>()

api.use('/*', (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
  })
  //@ts-ignore
  return jwtMiddleware(c, next)
})
api.use('/*', async (c, next) => {
  const jwtPayload = c.get('jwtPayload') as {sessionId: string}
  const sessionModel = useSessionModel(c.env.DB)
  const session = await sessionModel.find(jwtPayload.sessionId)

  if ( !session){
    throw new HTTPException(401, {message: 'No session found for this accessToken'})
  }

  c.set('session', session)
  await next()
})

api.route('/s3', s3)

/*
api.use('/me/*', async (c, next) => {
  const jwtToken = getCookie(c, COOKIE_NAME)
  if ( !jwtToken){
    throw new HTTPException(401)
  }
  const decodedPayload = await verify(jwtToken, c.env.JWT_SECRET)
  if ( !decodedPayload){
    throw new HTTPException(401)
  }

  const jwtData = decodedPayload.data as JWTPayloadData

  c.set('token', jwtData.token)
  c.set('user-google', jwtData.user)
  c.set('granted-scopes', jwtData.grantedScopes)
  await next()
})
*/

api.use('/g/*', async (c, next) => {
  const session = c.get('session')
  const authToken = session.authToken as SessionOAuthToken
  const tokenExpired = () => {
    const now = Math.floor(Date.now()/1e3)

    return (authToken?.expiredAt || 0) < now
  }
  if (session.authProvider !== "google"){
    throw new HTTPException(403, {message: `You are not logged in with Google Account!`})
  }
  if (authToken && authToken.token && tokenExpired()){
    console.log('Google Access Token Expired')
    if (authToken['refresh-token']){
      const redirectUri = new URL(c.req.url)
      redirectUri.pathname = '/auth/google'
      redirectUri.search = ''

      try {
        const newGoogleToken = await refreshToken({
          client_id: c.env.GOOGLE_ID,
          client_secret: c.env.GOOGLE_SECRET,
          refresh_token: authToken['refresh-token']?.token,
          redirect_uri: redirectUri.href
        })

        console.log({newGoogleToken})

        if ('error' in newGoogleToken) {
          throw new HTTPException(400, { message: newGoogleToken.error_description })
        }

        if ('access_token' in newGoogleToken) {
          authToken.token = {
            token: newGoogleToken.access_token,
            expires_in: newGoogleToken.expires_in,
          }

          if ('refresh_token' in newGoogleToken){
            authToken['refresh-token'] = {
              token: newGoogleToken.refresh_token as string
            }
          }

          authToken.expiredAt = Math.floor(Date.now()/1e3) + (newGoogleToken.expires_in || 3598)

          session.authToken = authToken

          const sessionModel = useSessionModel(c.env.DB)
          try {
            await sessionModel.save(session)
          } catch (err: any){
            throw new HTTPException(500, {message: err.message})
          }

          // sleep for 1.5 second
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (err: any){
        console.error('getAccessTokenWithRefreshToken Error', err)
        throw new HTTPException(500, {message: `${err.cause || err.message}`})
      }
    } else {
      revokeToken(authToken.token?.token)
      throw new HTTPException(403, {message: `Your Google Access Token is expired! Please re-loggin with your Google Account.`})
    }
  }

  c.set('token-google', authToken)
  return next()
})

api.get('/g/contacts', async c => {
  const gToken = c.get('token-google')
  const gContact = new GoogleContact(gToken.token?.token as string)
  console.log('getContacts')
  const pageToken = c.req.query('page')
  try {
    const contacts = await gContact.getContacts({pageToken});
    return c.json({status: 200, contacts})
  } catch (err: any){
    console.log(err)
    throw new HTTPException(500, {message: `${err.cause || err.message}`})
  }
})

api.get('/g/contact/:contactId', async c => {
  const gToken = c.get('token-google')
  const gContact = new GoogleContact(gToken.token?.token as string)
  const { contactId } = c.req.param()

  try {
    const contact = await gContact.getContact(contactId)
    return c.json({status: 200, contact})
  } catch (err){
    throw new HTTPException(500, {message: `${err.cause || err.message}`})
  }
})

api.delete('/g/contact', async c => {
  const gToken = c.get('token-google')
  const gContact = new GoogleContact(gToken.token?.token as string)

  const { resourceName } = await c.req.json<{resourceName: string|string[]}>()

  try {
    const r = (await gContact.deleteContact(resourceName)) as {error?: any}
    if (r.error){
      throw new HTTPException(500, {message: r.error.message})
    }
    return c.json({status: 200})
  } catch (err: any){
    throw new HTTPException(500, {message: `${err.cause || err.message}`})
  }
})

export default api;
