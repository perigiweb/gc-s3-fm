import type { GoogleErrorResponse, GoogleTokenResponse, GoogleUser } from './types'

export async function refreshToken(options: {
  client_id?: string
  client_secret?: string
  refresh_token?: string
  redirect_uri?: string
}) {
  const response = (await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      clientId: options.client_id,
      clientSecret: options.client_secret,
      redirect_uri: options.redirect_uri,
      refresh_token: options.refresh_token,
      grant_type: 'refresh_token',
    }),
  }).then((res) => res.json())) as GoogleTokenResponse | GoogleErrorResponse

  return response
}