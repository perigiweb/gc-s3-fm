import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { jwt } from 'hono/jwt'
import type { GoogleUser } from '@hono/oauth-providers/google'

import { GoogleContact } from '../../../lib/google/contact'

import { useSessionModel } from '../../models/session'
import type { Session, SessionOAuthToken } from '../../models/types'

import s3 from './s3'

type Bindings = {
  DB: D1Database,
  GOOGLE_CLIENT_ID: string,
  GOOGLE_CLIENT_SECRET: string,
  GOOGLE_OAUTH_SCOPE: string,
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

api.use('/g/*', (c, next) => {
  const session = c.get('session')
  const authToken = session.authToken as SessionOAuthToken
  const tokenNotExpired = () => {
    const now = Math.floor(Date.now()/1e3)

    return (authToken?.expiredAt || 0) > now
  }
  if ( !(session.authProvider === "google" && authToken && authToken.token && tokenNotExpired())){
    throw new HTTPException(403, {message: `You are not logged in with Google Account or Google Access Token is expired!`})
  }

  c.set('token-google', authToken)
  return next()
})

api.get('/g/contacts', async c => {
  const gToken = c.get('token-google')
  const gContact = new GoogleContact(gToken.token?.token as string)

  const pageToken = c.req.query('page')
  const contacts = await gContact.getContacts({pageToken});

  return c.json({status: 200, contacts})
})

export default api;
