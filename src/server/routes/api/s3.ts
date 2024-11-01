import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { validator } from 'hono/validator'
import type { ValidationFunction } from 'hono/validator'

import { useS3ProviderModel } from '../../models/s3provider'
import type { S3Provider, Session } from '../../models/types'

import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectsCommand,
  DeleteBucketCommand,
  ListBucketsCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"

import type {
  Bucket,
  ListBucketsOutput,
  ListObjectsOutput,
  _Object,
  Owner,
  PutObjectOutput,
  DeleteObjectOutput
} from '@aws-sdk/client-s3'

type Bindings = {
  DB: D1Database,
}

type Variables = {
  s3Provider: S3Provider,
  s3Client: S3Client,
  s3Region?: string,
  session: Session,
}

interface UploadFile {
  name: string,
  size: number,
  mime: string,
  data: string
}
interface UploadObjectPayload {
  name?: string,
  file: UploadFile,
  keyPrefix: string
}

const createS3Client = (provider: S3Provider) : S3Client => new S3Client({
  credentials: {
    accessKeyId: provider.accessKeyId,
    secretAccessKey: provider.accessSecretKey
  },
  region: provider.region,
  endpoint: provider.endpoint
})

const s3 = new Hono<{Bindings: Bindings, Variables: Variables}>()

s3.get('/', async c => {
  const m = useS3ProviderModel(c.env.DB)
  const session = c.get('session')

  const providers = await m.findBy({userId: session.userId}, 'name ASC')
  providers.map(p => {
    p.objectBaseUrl = p.objectBaseUrl.replace('{region}', p.region)
  })

  return c.json({status: 200, session, providers})
})

const providerSchema = z.object({
  name: z.string().trim().min(1, {message: "Name is required"}),
  accessKeyId: z.string().trim().min(1, {message: "Access Key ID is required"}),
  accessSecretKey: z.string().trim().min(1, {message: "Access Secret Key is required"}),
  region: z.string().trim().min(1, {message: "Region is required"}),
  endpoint: z.string().trim().min(1, {message: "S3 API Endpoint is required"}),
  objectBaseUrl: z.string().trim().min(1, {message: "Public URL Template is required"}).startsWith('http', {message: "Public URL Template must start with 'http://' or 'https://'"}),
  bucket: z.string().trim().nullable(),
  website: z.string().trim().nullable()
})
// @ts-expect-error not typed well
const vCallback: ValidationFunction = async (v, c) => {
  const result = await providerSchema.safeParseAsync(v)
  console.log(result)
  if ( !result.success){
    return c.json({error: true, fields: result.error.flatten().fieldErrors}, 422)
  }

  const data = result.data
  return data
}

// @ts-ignore
s3.post('/:id?', validator('json', vCallback), async c => {
  const postBody = (c.req.valid('json' as never)) as Partial<S3Provider>
  try {
    const m = useS3ProviderModel(c.env.DB)
    const session = c.get('session')

    const id = c.req.param('id') || postBody.id
    if (id){
      const _p = await m.find(id)
      if (!_p || _p?.userId !== session.userId){
        throw new HTTPException(403, {message: 'Update failed! You have no permision to update this provider.'})
      }
      postBody.id = id
    }

    if ( !id){
      postBody.userId = session.userId
    }

    await m.save(postBody)

    return c.json({success: true}, 201)
  } catch (err: any){
    throw new HTTPException(400, {message: err.message})
  }
})

s3.delete('/:id?', async c => {
  let { id } = await c.req.json<{id?: string|string[]}>()

  if ( !id) {
    throw new HTTPException(400, {message: 'Provider id is required'})
  }

  const m = useS3ProviderModel(c.env.DB)
  const s = c.get('session')

  try {
    const r = await m.delete(id, {userId: s.userId})

    return c.json({success: r, id: id})
  } catch (err: any){
    throw new HTTPException(400, {message: err.message})
  }
})

s3.use('/:p/*', async (c, next) => {
  const p = c.req.param('p')
  const s = c.get('session')
  const m = useS3ProviderModel(c.env.DB)
  const provider = await m.find(p)
  if ( !provider || provider.userId !== s.userId){
    throw new HTTPException(404, {message: `S3 Provider with id '${p}' not found!`})
  }

  const s3Client = createS3Client(provider)

  c.set('s3Provider', provider)
  c.set('s3Client', s3Client)

  return next()
})

s3.get('/:p/:b/:prefix{.*}?', async c => {
  const payload : {
    status: number,
    message: string,
    provider: S3Provider|undefined,
    data: ListObjectsOutput|undefined
  } = {
    status: 422,
    message: "",
    provider: undefined,
    data: undefined
  }
  const { b, prefix } = c.req.param()
  const provider = c.get('s3Provider')

  payload.provider = provider
  const client = c.get('s3Client')
  const listObjectsCmd = new ListObjectsV2Command({
    Bucket: b,
    MaxKeys: 100,
    Delimiter: '/',
    Prefix: prefix ? prefix.replace(/\/$/, '')+'/':''
  })
  try {
    const response : ListObjectsOutput = await client.send(listObjectsCmd)
    payload.status = 200
    payload.data = response
  } catch (err: any){
    payload.message = `${err.message}`
  }


  return c.json(payload, 200)
})

s3.post('/:p/:b', async c => {
  const responsePayload : {status: number, message:string|undefined, data: PutObjectOutput|undefined} = {
    status: 422,
    message: 'Unprocessed Content',
    data: undefined
  }
  const { b } = c.req.param()

  const {name, file, keyPrefix} = await c.req.json<UploadObjectPayload>()
  if (file.data){
    const s = file.data.split(/^data\:(.*);base64,(.*)$/)
    const buf = Buffer.from(s[2], 'base64')
    const putObjectCmd = new PutObjectCommand({
      ACL: 'public-read',
      Bucket: b,
      Key: `${keyPrefix ? keyPrefix.replace(/^\/+|\/+$/g, '')+'/':''}${file.name}`,
      Body: buf,
      ContentType: file.mime || s[1].trim(),
      Metadata: {
        'Content-Type': file.mime
      }
    })

    const client = c.get('s3Client')
    try {
      const putResponse: PutObjectOutput = await client.send(putObjectCmd)
      responsePayload.status  = 200
      responsePayload.message = "File successfully uploaded."
      responsePayload.data = putResponse
    } catch (err: any){
      responsePayload.message = `${err.message}`
    }
  }

  return c.json(responsePayload, 200)
})

s3.delete('/:p/:b', async c => {
  const responsePayload : {status: number, message:string|undefined} = {
    status: 422,
    message: 'Unprocessed Content'
  }
  const {b} = c.req.param()
  const { objectKey } = await c.req.json<{objectKey: string}>()

  const delObjectCmd = new DeleteObjectCommand({
    Bucket: b,
    Key: objectKey
  })
  const client = c.get('s3Client')
  try {
    const r: DeleteObjectOutput = await client.send(delObjectCmd)
    responsePayload.status = 200
    responsePayload.message = "Object successfully deleted!"
  } catch (err){
    //@ts-ignore
    responsePayload.message = `${err.message}`
  }

  return c.json(responsePayload, 200)
})
s3.get('/:p', async c => {
  const payload : {
    status: number,
    message: string,
    provider: S3Provider|undefined,
    buckets: Bucket[]|undefined,
    owner?: Owner
  } = {
    status: 422,
    message: "",
    provider: undefined,
    buckets: undefined,
    owner: undefined
  }

  const provider = c.get('s3Provider')

  payload.provider = provider
  if (provider.bucket){
    payload.status  = 200
    payload.buckets = [
      {
        Name: provider.bucket
      }
    ]
  } else {
    const client = c.get('s3Client')
    const listBucketCmd = new ListBucketsCommand({MaxBuckets: 20})
    try {
      const response : ListBucketsOutput = await client.send(listBucketCmd)
      payload.status  = 200
      payload.buckets = response.Buckets
      payload.owner   = response.Owner
    } catch (err){
      //@ts-ignore
      payload.message = `${err.message}`
    }
  }

  return c.json(payload, 200)
})

export default s3;
