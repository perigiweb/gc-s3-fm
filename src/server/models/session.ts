import Model from './model'
import type { Session, SessionOAuthToken } from './types'

export function useSessionModel(db: D1Database){
  const SessionModel = class extends Model<Session> {
    castValue = (s: Session) => {
      if (typeof s.authToken === "string"){
        s.authToken = JSON.parse(s.authToken as string) as SessionOAuthToken
      }

      return s
    }
  }

  return new SessionModel({
    db,
    tableName: 'sessions',
    timestamps: false
  })
}