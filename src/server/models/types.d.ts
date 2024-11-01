import type { OAuthVariables } from "@hono/oauth-providers"

type Entity = object

type User = {
  id?: string,
  role: string,
  email: string,
  password: string|null,
  name: string,
  status: number,
  registeredAt?: Date,
  updatedAt?: Date,
  picture?: string|null,
  newPassword?: string,
  registeredVia?: string|null
}

type Token = {
  token: string,
  expires_in: number,
}

type SessionOAuthToken = {
  expiredAt: number
} & OAuthVariables

type Session = {
  id?: string,
  userId: string|null,
  createdAt: Date|null,
  status: boolean,
  userAgent: string|null,
  ip: string|null,
  expiredAt: number|null,
  authProvider: string|null,
  authToken: SessionOAuthToken|string|null
}

type S3Provider = {
  id?: string,
  userId?: string|null,
  name: string,
  website?: string|null,
  bucket?: string|null,
  objectBaseUrl: string,
  accessKeyId: string,
  accessSecretKey: string,
  endpoint: string,
  region: string,
  createdAt?: Date,
  updatedAt?: Date
}

export type {
  Entity,
  User,
  Token,
  SessionOAuthToken,
  Session,
  S3Provider
}