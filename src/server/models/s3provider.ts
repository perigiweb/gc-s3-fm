import { v4 } from 'uuid'
import Model from './model'
import type { S3Provider } from './types'

export function useS3ProviderModel(db: D1Database){

  return new Model<S3Provider>({
    db,
    tableName: 's3_providers'
  })
}