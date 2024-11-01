<template>
  <div class="mb-4 pb-1 border-b border-slate-400 dark:border-slate-700 text-sm font-sans flex items-center gap-1">
    <RouterLink to="/s3">S3 Home</RouterLink>
    <span>/</span>
    <RouterLink :to="`/s3/${route.params.provider}`">{{ provider?.name || route.params.provider }}</RouterLink>
    <span>/</span>
    <RouterLink v-if="route.params.prefix" :to="`/s3/${route.params.provider}/${route.params.bucket}`">{{ route.params.bucket }}</RouterLink>
    <span v-else>{{ route.params.bucket }}</span>
    <span v-if="route.params.prefix">/</span>
    <template v-if="prefixBreadcrumb.items" v-for="pItem in prefixBreadcrumb.items">
      <RouterLink :to="`${pItem.link}`">{{ pItem.name }}</RouterLink>
      <span>/</span>
    </template>
    <span v-if="prefixBreadcrumb.last">{{ prefixBreadcrumb.last }}</span>
  </div>
  <div v-if="uploadErrMsg" class="bg-red-300 text-red-900 px-3 py-2 rounded mb-2">{{ uploadErrMsg }}</div>
  <form @submit.prevent="upload" method="post" class="flex items-center gap-3 mb-4" enctype="multipart/form-data">
    <input type="file" id="file" @change="processFile" required
      class="text-slate-800 dark:text-slate-100 block w-full text-sm border border-slate-400 dark:border-slate-700 rounded file:bg-slate-300 dark:file:bg-slate-700 file:text-slate-900 dark:file:text-slate-100 file:py-2 file:px-3 file:border-0 file:mr-4 file:font-semibold file:text-sm cursor-pointer">
    <input v-model="objectKeyPrefix" type="text" placeholder="Object Prefix or Directory (ex: path/to)"
      class="w-full text-slate-800 dark:text-slate-100 text-sm border border-slate-400 dark:border-slate-700 rounded bg-transparent px-3 py-2">
    <button type="submit" class="px-6 py-2 text-sm font-semibold bg-green-600 dark:bg-green-300 text-green-100 dark:text-green-950 border border-green-600 dark:border-green-300 rounded disabled:bg-green-600 dark:disabled:bg-green-500 disabled:text-green-400 dark:disabled:text-green-800 disabled:cursor-not-allowed" :disabled="isUploading">Upload</button>
  </form>
  <div v-if="loading" class="text-center text-sm">Loading...</div>
  <div v-else-if="errMsg" class="bg-red-300 text-red-900 px-4 py-2 rounded">{{ errMsg }}</div>
  <div v-else>
    <div v-if="(objects && objects.length) || (prefixes && prefixes.length)">
      <div class="border border-slate-400 dark:border-slate-600 rounded text-sm overflow-hidden">
        <table class="table-auto border-collapse w-full">
          <thead>
            <tr>
              <th class="text-left p-2 bg-slate-300 dark:bg-slate-800">Name</th>
              <th class="text-left p-2 bg-slate-300 dark:bg-slate-800">Date</th>
              <th class="text-left p-2 bg-slate-300 dark:bg-slate-800">Size</th>
              <th class="text-left p-2 bg-slate-300 dark:bg-slate-800">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
          <template v-for="prefix in prefixes">
            <tr>
              <td class="p-2 border-t border-slate-400 dark:border-slate-600">
                <RouterLink :to="`/s3/${route.params.provider}/${route.params.bucket}/${prefix.Prefix?.replace(/\/$/, '')}`">{{ prefix.Prefix?.replace(/\/$/, '').split('/').pop() }}</RouterLink>
              </td>
              <td class="p-2 border-t border-slate-400 dark:border-slate-600">-</td>
              <td class="p-2 border-t border-slate-400 dark:border-slate-600 text-right"></td>
              <td class="text-right p-2 border-t border-slate-400 dark:border-slate-600"></td>
            </tr>
          </template>
          <template v-for="object in objects">
            <tr>
              <td class="p-2 border-t border-slate-400 dark:border-slate-600">
                <a :href="objectUrl(object.Key as string)" target="_blank">{{ object.Key?.split('/').pop() }}</a>
              </td>
              <td class="p-2 border-t border-slate-400 dark:border-slate-600">{{ fmtDate(object.LastModified as Date) }}</td>
              <td class="p-2 border-t border-slate-400 dark:border-slate-600 text-right">{{ fmtBytes(object.Size as number, 2) }}</td>
              <td class="text-right p-2 border-t border-slate-400 dark:border-slate-600">
                <button type="button" :disabled="isDeleting" @click.prevent="deleteObject(object.Key as string)" class="px-2 py-1 text-size-3 font-semibold bg-red-300 text-red-950 rounded disabled:bg-red-300 disabled:text-red-700">Delete</button>
              </td>
            </tr>
          </template>
          </tbody>
        </table>
      </div>
    </div>
    <div v-else  class="bg-orange-300 text-orange-900 px-4 py-2 rounded">No object found</div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'

import { fmtDate, fmtBytes } from '../../../lib/utils'
import { useAuth } from '../../stores/auth'
import { useProviderStore } from '../../stores/s3provider'
import type { S3Provider } from '../../../server/models/types'
import { usePageTitle } from '../../stores/pagetitle'

usePageTitle('Bucket Objects List')

import type {
  CommonPrefix,
  ListObjectsOutput,
  _Object,
  PutObjectOutput
} from '@aws-sdk/client-s3'

interface ObjectResponse {
  status: number,
  message: string,
  provider?: S3Provider,
  data?: ListObjectsOutput,
}

interface UploadedFile {
  name: string,
  size: number,
  mime: string,
  data: string
}

interface UploadResponse {
  status: number,
  message?:string,
  data?: PutObjectOutput
}

const route        = useRoute()
const loading      = ref(true)
const errMsg       = ref<string>('')
const provider     = useProviderStore().getProvider(route.params.provider as string)
const prefixes     = ref<CommonPrefix[]>()
const objects      = ref<_Object[]>()
const isUploading  = ref(false)
const isDeleting   = ref(false)
const uploadedFile    = ref<UploadedFile>()
const objectKeyPrefix = ref<string>('')
const uploadErrMsg    = ref<string>()
const { accessToken } = useAuth()

const objectUrl = (objectKey : string) : string => {
  return provider.value?.objectBaseUrl.replace('{bucket}', route.params.bucket as string).replace('{objectKey}', objectKey) || ''
}
const processFile = (event: Event) => {
  const input = event.target as HTMLInputElement
  //uploadedFiles.value = []
  if (input.files){
    const file = input.files[0]
    //for (const file of files){
      const r = new FileReader()
      r.onload = () => {
        uploadedFile.value = {
          name: file.name,
          size: file.size,
          mime: file.type,
          data: r.result as string
        }
      }

      r.readAsDataURL(file)
    //}
  }

  //event.target.value = ''
}

const upload = (event : Event) => {
  isUploading.value = true
  uploadErrMsg.value = ''

  fetch(`/api/s3/${route.params.provider}/${route.params.bucket}`, {
    method: 'POST',
    body: JSON.stringify({file: uploadedFile.value, keyPrefix: objectKeyPrefix.value}),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken.value}`
    }
  }).then(async response => {
    if (response.ok){
      return (await response.json()) as UploadResponse
    }

    throw new Error(await response.text())
  }).then(uploadResponse => {
    if (uploadResponse.status === 200){
      fetchObjects()
    } else {
      uploadErrMsg.value = uploadResponse.message || "Unknown upload file error"
    }
  }).catch(err => {
    uploadErrMsg.value = err.message
  }).finally(() => {
    isUploading.value = false
  })
}

const deleteObject = (objectKey: string) => {
  isDeleting.value = true
  fetch(`/api/s3/${route.params.provider}/${route.params.bucket}`, {
    method: "DELETE",
    body: JSON.stringify({objectKey}),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken.value}`
    }
  }).then(async response => {
    if (response.ok){
      return (await response.json()) as ObjectResponse
    }

    throw new Error(await response.text())
  }).then(objectResponse => {
    if (objectResponse.status === 200){
      fetchObjects()
    } else {
      uploadErrMsg.value = objectResponse.message || 'Unknown delete error!'
    }
  }).catch(err => {
    errMsg.value = err.message
  }).finally(() => {
    isDeleting.value = false
  })
}

const fetchObjects = () => {
  loading.value = true

  let keyPrefix = ''
  if (route.params.prefix){
    if (typeof route.params.prefix !== "string"){
      keyPrefix = route.params.prefix.join('/')
    } else {
      keyPrefix = route.params.prefix
    }

    keyPrefix = `/${keyPrefix}`
  }

  fetch(`/api/s3/${route.params.provider}/${route.params.bucket}${keyPrefix}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken.value}`
    }
  }).then(async response => {
    if (response.ok){
      return (await response.json()) as ObjectResponse
    }

    throw new Error(await response.text())
  }).then(objectResponse => {
    if (objectResponse.status === 200 && objectResponse.data){
      prefixes.value = objectResponse.data.CommonPrefixes
      objects.value = objectResponse.data.Contents
      //provider.value = objectResponse.provider
    } else {
      errMsg.value = objectResponse.message
    }
  }).catch(err => {
    errMsg.value = err.message
  }).finally(() => {
    loading.value = false
  })
}

const prefixBreadcrumb = computed(() => {
  const p = route.params.prefix
  const b:{items?:{name:string, link:string}[], last?: string} = {}
  if ( !p){
    return b
  }
  if (typeof p !== "string"){
    b.last = p[p.length - 1]

    let l = `/s3/${route.params.provider}/${route.params.bucket}`
    for(let z = 0; z < p.length - 1; z++){
      const item = p[z]
      l += `/${item}`

      const i = {
        name: item,
        link: l
      }

      if (b.items){
        b.items.push(i)
      } else {
        b.items = [i]
      }
    }
  } else {
    b.last = p
  }

  return b
})

onMounted(() => {
  fetchObjects()
  if (route.params.prefix){
    if (typeof route.params.prefix != "string"){
      objectKeyPrefix.value = route.params.prefix.join('/')
    } else {
      objectKeyPrefix.value = route.params.prefix
    }
  }
})
</script>