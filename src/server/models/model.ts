import { v4 } from 'uuid'

import { Entity } from './types'

type ModelOptions = {
  db: D1Database,
  tableName: string,
  primaryKey?: string,
  autoIncrement?: boolean,
  timestamps?: boolean,
  createdAtKey?: string,
  updatedAtKey?: string,
}

const Model = class<T extends Entity> {
  db: D1Database
  tableName: string
  primaryKey: string
  autoIncrement: boolean = false

  timestamps: boolean = true
  createdAtKey: string = 'createdAt'
  updatedAtKey: string = 'updatedAt'

  castValue: (m: T) => T

  constructor({
    db,
    tableName,
    primaryKey,
    autoIncrement,
    timestamps,
    createdAtKey,
    updatedAtKey
  } : ModelOptions){
    this.db = db
    this.tableName = tableName
    this.primaryKey = primaryKey || 'id'
    if (autoIncrement !== undefined){
      this.autoIncrement = autoIncrement
    }
    if (timestamps !== undefined){
      this.timestamps = timestamps
    }
    if (createdAtKey !== undefined){
      this.createdAtKey = createdAtKey
    }
    if (updatedAtKey !== undefined){
      this.updatedAtKey = updatedAtKey
    }

    this.castValue = (m: T) => m
  }

  async find(id: any) : Promise<T|null> {
    const result = await this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id=? LIMIT 1`)
      .bind(id).first<T|null>()

    if (this.castValue && typeof this.castValue === "function"){
      return this.castValue(result as T)
    }

    return result
  }

  async findOneBy(criteria: Partial<T>, orderBy?: string): Promise<T|null|undefined> {
    const results = await this.findBy(criteria, orderBy, 1)

    return results.length ? results.shift():null
  }

  async findBy(criteria?: Partial<T>, orderBy?: string, limit?: number, offset?: number) : Promise<T[]> {
    const fields: string[] = []
    const values: any[] = []

    if (criteria){
      Object.keys(criteria).forEach(k => {
        const v = criteria[k as keyof T]
        if (v){
          if (v instanceof Date){
            values.push(v.toISOString())
          } else {
            values.push(v)
          }
          fields.push(`${k}=?${values.length}`)
        }
      })
    }

    let sql = `SELECT * FROM ${this.tableName}`
    if (values.length){
      sql = `${sql} WHERE ${fields.join(' AND ')}`
    }
    if (orderBy){
      sql = `${sql} ORDER BY ${orderBy}`
    }
    if (limit){
      offset = offset ? offset:0
      sql = `${sql} LIMIT ${limit}`
      if (offset && offset > 0){
        sql = `${sql} OFFSET ${offset}`
      }
    }

    let { results } = await this.db.prepare(sql).bind(...values).all<T>()

    if (this.castValue && typeof this.castValue === "function"){
      results = results.map(result => this.castValue(result))
    }

    return results
  }

  async save(entity: Partial<T>) : Promise<T|null>{
    const fields: string[] = []
    const params: string[] = []
    const values: any[] = []

    let id = entity[this.primaryKey as keyof T]

    if (id !== undefined){
      entity[this.primaryKey as keyof T] = undefined
    }

    Object.keys(entity).forEach(k => {
      const v = entity[k as keyof T]
      if (v){
        fields.push(k)
        values.push(this.toSqlValue(v))
        params.push(`?${values.length}`)
      }
    })

    if (this.timestamps && !fields.includes(this.updatedAtKey)){
      fields.push(this.updatedAtKey)
      values.push((new Date()).toISOString())
      params.push(`?${values.length}`)
    }

    let sql : string = ''
    if (id){
      values.push(id)
      sql = `UPDATE ${this.tableName} SET (${fields.join(',')}) = (${params.join(',')}) WHERE id=?${values.length}`
    } else {
      if ( !this.autoIncrement){
        const _id = this.generateId()
        fields.push(this.primaryKey)
        values.push(_id)
        params.push(`?${values.length}`)
      }
      if (this.timestamps && !fields.includes(this.createdAtKey)){
        fields.push(this.createdAtKey)
        values.push((new Date()).toISOString())
        params.push(`?${values.length}`)
      }
      sql = `INSERT INTO ${this.tableName} (${fields.join(',')}) VALUES (${params.join(',')})`
    }

    return await this.db.prepare(`${sql} RETURNING *`).bind(...values).first<T|null>()
  }

  async delete(id: string|string[], othersCriteria?: Partial<T>) : Promise<boolean> {
    if (typeof id === "string"){
      id = [id]
    }

    const values: any[] = []
    const params: string[] = []
    id.forEach(v => {
      if (v){
        values.push(v)
        params.push(`?`)
      }
    })

    if (values.length < 1){
      throw new Error('No entity to delete!')
    }

    let c = ''
    if (othersCriteria){
      const cParams: string[] = []
      Object.keys(othersCriteria).forEach(k => {
        const v = othersCriteria[k as keyof T]
        if (v){
          if (v instanceof Date){
            values.push(v.toISOString())
          } else {
            values.push(v)
          }
          cParams.push(`${k} = ?`)
        }
      })
      if (cParams.length){
        c = ` AND ${cParams.join(' AND ')}`
      }
    }

    const sql = `DELETE FROM ${this.tableName} WHERE id IN (${params.join(',')})${c}`
    const stmt = this.db.prepare(sql)
    const r = await stmt.bind(...values).run()

    return r.success
  }

  generateId(){
    return v4()
  }

  toSqlValue(v: any){
    if (v instanceof Date){
      return v.toISOString()
    }
    if (v instanceof Object || v instanceof Array){
      return JSON.stringify(v)
    }

    return v
  }
}

export default Model