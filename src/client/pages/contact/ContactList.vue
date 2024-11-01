<template>
  <div v-if="errMsg" class="text-center">
    <div class="bg-red-300 text-red-900 px-4 py-2 rounded mb-6 text-center">{{ errMsg }}</div>
    <p v-if="responseStatus === 403"><a :href="`/auth/google?to=${route.fullPath}`" class="inline-block font-semibold font-sans bg-emerald-700 dark:bg-emerald-300 text-emerald-100 dark:text-emerald-900 px-5 py-2 rounded-3xl hover:bg-emerald-800 visited:bg-emerald-700 visited:text-emerald-100 dark:hover:bg-emerald-400 dark:hover:text-emerald-900 dark:visited:bg-emerald-300 dark:visited:text-emerald-900 hover:no-underline">Login with Google</a></p>
    <p><router-link :to="{name: 'home'}">&laquo; back to Home</router-link></p>
  </div>
  <div v-if="loading" class="text-center text-sm">Loading...</div>
  <template v-if="contacts && contacts.length">
    <div class="flex justify-between items-center text-sm">
      <div class="font-size-4 text-slate-700 dark:text-slate-400">Total Contacts: <b>{{ totalContacts }}</b></div>
      <div class="flex items-center gap-3">
        <a v-if="currentPage > 1" :href="`#p-${currentPage - 1}`" class="border rounded inline-block border-emerald-300 px-3">&laquo;</a>
        <a v-if="nextPage" :href="`#p-${currentPage + 1}`" class="border rounded inline-block border-emerald-300 px-3">&raquo;</a>
      </div>
    </div>
    <div v-for="contact in contacts" class="flex items-center gap-3 my-3 first:mt-0 last:mb-0">
      <img v-if="contact.photos && contact.photos.length" :src="contact.photos[0]?.url || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNcdQYAAiYBeL6Z75sAAAAASUVORK5CYII='" width="48" class="h-auto rounded shrink-0" loading="lazy">
      <div class="w-full">{{ contact.names ? contact.names[0].displayName:'' }}</div>
      <div class="w-full">{{ contact.phoneNumbers ? contact.phoneNumbers[0].canonicalForm:'' }}</div>
      <div class="w-full">{{ contact.emailAddresses ? contact.emailAddresses[0]?.value:'' }}</div>
    </div>
  </template>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePageTitle } from '../../stores/pagetitle'
import { useAuth } from '../../stores/auth'

import { ListConnectionsResponse, Person } from '../../../lib/google/contact.types'

interface ListContactsResponse {
  status: number,
  contacts?: ListConnectionsResponse
  message?: string,
  error?: boolean
}

const router = useRouter()
const route  = useRoute()

const contacts       = ref<Person[]>()
const totalContacts  = ref<number|null>()
const currentPage    = ref<number>(1)
const nextPage       = ref<string|null>()
const pages          = ref<string[]>([''])
const errMsg         = ref<string>('')
const loading        = ref(true)
const responseStatus = ref<number>()

const getContacts = async () => {
  loading.value = true
  const i = currentPage.value - 1
  const pageToken = pages.value[i] || '' //route.hash.replace(/^#/, '')
  const response = await fetch(`/api/g/contacts?page=${pageToken}`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${useAuth().accessToken.value}`
    }
  }).then(async response => {
    const r = await response.json<ListContactsResponse>()
    r.status = response.status
    return r
  })

  loading.value = false
  if ("contacts" in response && response.contacts){
    contacts.value = response.contacts.connections
    totalContacts.value = response.contacts.totalItems

    if (response.contacts.nextPageToken && !pages.value.includes(response.contacts.nextPageToken)){
      pages.value.push(response.contacts.nextPageToken)
    }

    nextPage.value = response.contacts.nextPageToken
    loading.value = false
    return true
  }

  responseStatus.value = response.status

  if (response.status === 401){
    errMsg.value = `You are not logged in.`
    return false
  }

  errMsg.value = `${response.message}`
  return false
}

watch(() => route.hash, (newHash, oldHash) => {
  currentPage.value = parseInt(newHash.replace(/^#p-/, ''))
  getContacts()
})

onMounted(async () => {
  if (route.hash){
    if (pages.value.length > 1){
      currentPage.value = parseInt(route.hash.replace(/^#p-/, ''))
    } else {
      currentPage.value = 1
      router.replace({
        name: 'g-contacts',
        hash: ''
      })
      return
    }
  }

  getContacts()
})

usePageTitle('Contacts List')
</script>