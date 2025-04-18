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

    deleteExpiredSession(): void {
      const now = Math.floor(Date.now()/1e3)
      const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE expiredAt < ?`)
      try {
        stmt.bind(...[now]).run()
      } catch (err: any){
        console.error(err)
      }
    }
  }

  const sessionModel = new SessionModel({
    db,
    tableName: 'sessions',
    timestamps: false
  })

  sessionModel.deleteExpiredSession()

  return sessionModel
}