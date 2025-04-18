<template>
  <div class="mb-4 pb-1 border-b border-slate-400 dark:border-slate-700 text-sm font-sans flex items-center gap-1">
    <RouterLink to="/s3">S3 Home</RouterLink>
    <span>&raquo;</span>
    <span>{{ provider?.name || route.params.provider }}</span>
  </div>
  <div v-if="loading" class="text-center text-sm">Loading...</div>
  <div v-else-if="errMsg" class="bg-red-300 text-red-900 px-4 py-2 rounded">{{ errMsg }}</div>
  <div v-else>
    <form @submit.prevent="createBucket" method="post" class="flex items-center gap-3 mb-4" enctype="multipart/form-data">
      <input v-model="bucketName" type="text" placeholder="Bucket Name"
        class="max-w-100 text-slate-800 dark:text-slate-100 text-sm border border-slate-400 dark:border-slate-700 rounded bg-transparent px-3 py-2"
        size="40">
      <button type="submit" class="text-nowrap px-6 py-2 text-sm font-semibold bg-green-600 dark:bg-green-300 text-green-100 dark:text-green-950 border border-green-600 dark:border-green-300 rounded disabled:bg-green-600 dark:disabled:bg-green-500 disabled:text-green-400 dark:disabled:text-green-800 disabled:cursor-not-allowed"
        :disabled="btnDisabled">Create Bucket</button>
    </form>
    <div class="flex gap-3 flex-wrap">
      <div class="py-2 px-4 bg-slate-300 dark:bg-slate-700 rounded flex items-center gap-5" v-for="bucket in buckets">
        <RouterLink :to="`/s3/${route.params.provider}/${bucket.Name}`" class="font-semibold">{{ bucket.Name }}</RouterLink>
        <span class="text-sm italic text-nowrap text-xs inline-block" v-if="bucket.CreationDate">{{ fmtDate(bucket.CreationDate as Date) }}</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { Bucket, Owner } from '@aws-sdk/client-s3'

import { fmtDate } from '../../../lib/utils'
import { useAuth } from '../../stores/auth'
import { useProviderStore } from '../../stores/s3provider'
import type { S3Provider } from '../../../server/models/types'
import { usePageTitle } from '../../stores/pagetitle'

usePageTitle('Buckets List')

interface BucketResponse {
  status: number,
  message: string,
  provider?: S3Provider,
  buckets?: Bucket[],
  owner?: Owner
}

interface CreateBucketResponse {
  status: number,
  message: string
}

const route      = useRoute()
const loading    = ref<boolean>(true)
const errMsg     = ref<string>('')
const buckets    = ref<Bucket[]>()
const owner      = ref<Owner>()
const bucketName = ref<string>('')
const provider   = useProviderStore().getProvider(route.params.provider as string)
const { accessToken } = useAuth()

const btnDisabled = computed(() => bucketName.value === '')

const createBucket = () => {
  fetch(`/api/s3/${route.params.provider}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken.value}`
    },
    body: JSON.stringify({bucketName: bucketName.value})
  }).then(async response => {
    if (response.ok){
      return (await response.json()) as CreateBucketResponse
    }

    throw new Error(await response.text())
  }).then(createBucketResponse => {
    console.log(createBucketResponse)
    if (createBucketResponse.status === 201){

    } else {
      errMsg.value = createBucketResponse.message
    }
  }).catch(err => {
    //errMsg.value = err.message
    console.log(err)
  })
}

onMounted(() => {
  //console.log(provider.value.bucket)
  if (provider?.value?.bucket){
    useRouter().push({path: `/s3/${provider.value.id}/${provider.value.bucket}`})
    return
  }
  fetch(`/api/s3/${route.params.provider}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken.value}`
    }
  }).then(async response => {
    if (response.ok){
      return (await response.json()) as BucketResponse
    }

    throw new Error(await response.text())
  }).then(bucketResponse => {
    if (bucketResponse.status === 200){
      buckets.value = bucketResponse.buckets
      owner.value = bucketResponse.owner
      //provider.value = bucketResponse.provider
    } else {
      errMsg.value = bucketResponse.message
    }
  }).catch(err => {
    errMsg.value = err.message
  }).finally(() => {
    loading.value = false
  })
})
</script>
