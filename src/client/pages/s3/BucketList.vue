<template>
  <div class="mb-4 pb-1 border-b border-slate-400 dark:border-slate-700 text-sm font-sans flex items-center gap-1">
    <RouterLink to="/s3">S3 Home</RouterLink>
    <span>&raquo;</span>
    <span>{{ provider?.name || route.params.provider }}</span>
  </div>
  <div v-if="loading" class="text-center text-sm">Loading...</div>
  <div v-else-if="errMsg" class="bg-red-300 text-red-900 px-4 py-2 rounded">{{ errMsg }}</div>
  <div v-else class="flex gap-3 flex-wrap">
    <div class="py-2 px-4 bg-slate-300 dark:bg-slate-700 rounded flex items-center gap-5" v-for="bucket in buckets">
      <RouterLink :to="`/s3/${route.params.provider}/${bucket.Name}`" class="font-semibold">{{ bucket.Name }}</RouterLink>
      <span class="text-sm italic text-nowrap text-xs inline-block" v-if="bucket.CreationDate">{{ fmtDate(bucket.CreationDate as Date) }}</span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

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

const route    = useRoute()
const loading  = ref(true)
const errMsg   = ref<string>('')
const buckets  = ref<Bucket[]>()
const owner    = ref<Owner>()
const provider = useProviderStore().getProvider(route.params.provider as string)
const { accessToken } = useAuth()

onMounted(() => {
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