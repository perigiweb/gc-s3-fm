import { v4 } from 'uuid'
import bcrypt from 'bcrypt'

import Model from './model'
import type { User } from './types'

export function passwordHash(plainPass: string) : string {
  const salt = bcrypt.genSaltSync(12)

  return bcrypt.hashSync(plainPass, salt)
}

export function passwordVerify(plainPass: string, hashedPass: string) : boolean {
  return bcrypt.compareSync(plainPass, hashedPass)
}

export function useUserModel(db: D1Database){
  return new Model<User>({
    db,
    tableName: 'users',
    createdAtKey: 'registerdAt'
  })
  /*
  function passwordHash(plainPass: string) : string {
    const salt = bcrypt.genSaltSync(12)

    return bcrypt.hashSync(plainPass, salt)
  }
  function passwordVerify(plainPass: string, hashedPass: string) : boolean {
    return bcrypt.compareSync(plainPass, hashedPass)
  }
  async function save(u: Partial<User>) : Promise<User|null> {
    const fields: string[] = []
    const params: string[] = []
    const values: any[] = []
    let id = u.id

    if (u.id !== undefined){
      u.id = undefined
    }

    if ("newPassword" in u && u.newPassword){
      u.password = passwordHash(u.newPassword)
      delete u.newPassword
    }
    Object.keys(u).forEach(k => {
      const v = u[k as keyof User]
      if (v){
        fields.push(k)
        if (v instanceof Date){
          values.push(v.toISOString())
        } else {
          values.push(v)
        }
        params.push(`?${values.length}`)
      }
    })

    if ( !fields.includes('updatedAt')){
      fields.push('updatedAt')
      values.push((new Date()).toISOString())
      params.push(`?${values.length}`)
    }

    let sql: string = ''
    if (id){
      values.push(id)
      sql = `UPDATE users SET (${fields.join(',')}) = (${params.join(',')}) WHERE id=?${values.length}`
    } else {
      id = v4()
      fields.push('id')
      params.push(`?${fields.length}`)
      values.push(id)
      if ( !fields.includes('registeredAt')){
        fields.push('registeredAt')
        params.push(`?${fields.length}`)
        values.push((new Date()).toISOString())
      }
      sql = `INSERT INTO users (${fields.join(',')}) VALUES (${params.join(',')})`
    }

    return await db.prepare(`${sql} RETURNING *`).bind(...values).first<User|null>()
  }

  async function findOneBy(criteria: Partial<User>) : Promise<User|null>{
    const fields: string[] = [],
      values: any[] = []

    Object.keys(criteria).forEach(k => {
      fields.push(`${k}=?`)
      values.push(criteria[k as keyof User])
    })

    return await db.prepare(`SELECT * FROM users WHERE ${fields.join(',')} LIMIT 1`).bind(...values).first<User>()
  }

  async function findOneById(id: string) : Promise<User|null> {
    return await db.prepare("SELECT * FROM users WHERE id=? LIMIT 1")
      .bind(id).first<User>()
  }

  return {
    save,
    findOneBy,
    findOneById,
    passwordHash,
    passwordVerify
  }
  */
}