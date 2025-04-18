<template>
  <div class="h-full flex flex-col">
    <div v-if="errMsg" class="text-center flex-none">
      <div class="bg-red-300 text-red-900 px-4 py-2 rounded mb-6 text-center">
        {{ errMsg }}
        <button v-if="responseStatus === 500" @click.prevent="getContacts"
          class="bg-transparent border-b-1 border-red-900 leading-tight inline-flex items-center ms-4 gap-1"
        ><i class="i-mage-reload inline-block h-1em w-1em"></i><span>Reload</span></button>
      </div>
      <p v-if="responseStatus === 403"><a :href="`/auth/google?to=${route.fullPath}`" class="inline-block font-semibold font-sans bg-emerald-700 dark:bg-emerald-300 text-emerald-100 dark:text-emerald-900 px-5 py-2 rounded-3xl hover:bg-emerald-800 visited:bg-emerald-700 visited:text-emerald-100 dark:hover:bg-emerald-400 dark:hover:text-emerald-900 dark:visited:bg-emerald-300 dark:visited:text-emerald-900 hover:no-underline">Login with Google</a></p>
      <p v-if="responseStatus !== 500"><router-link :to="{name: 'home'}">&laquo; back to Home</router-link></p>
    </div>
    <div class="flex-none flex justify-between items-center text-sm gap-4 leading-none pb-2 px-2">
      <div v-if="contacts && contacts.length" class="flex items-center gap-3 flex-shrink-0 flex-nowrap">
        <input type="checkbox" value="1" v-model="selectAll"
          class="size-3.5 appearance-none rounded-sm border border-slate-400 accent-emerald-700 checked:appearance-auto dark:border-slate-400 dark:accent-emerald-300">

          <button v-if="contactSelected.length" type="button" :disabled="delBtnDisabled"
            class="bg-transparent leading-none text-red-700 dark:text-red-500 font-500 rounded flex items-center gap-1 p-1 disabled:text-gray-500 border border-red-700 dark:border-red-500" 
            @click.prevent="delContact(undefined)"
          ><i class="inline-block i-mage-trash-fill align-middle"></i><span>Delete</span></button>
          <button v-else @click.prevent="getContacts"
            class="bg-transparent leading-tight inline-flex items-center"
          ><i class="i-mage-reload inline-block h-1em w-1em text-slate-900 dark:text-white"></i></button>
      </div>
      <div v-if="loading" class="font-size-3 text-sm w-full text-center">Loading...</div>
      <div v-if="contacts && contacts.length" class="font-size-3 text-slate-700 dark:text-slate-400 ms-auto text-nowrap" v-html="totalContact"></div>
      <div class="flex items-center gap-1 font-size-4">
        <a v-if="currentPage > 1" :href="`#p-${currentPage - 1}`"
          class="hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full h-1.5em w-1.5em inline-flex items-center justify-center"
        ><i class="i-mage-chevron-left inline-block h-1em w-1em text-slate-800 dark:text-slate-100"></i></a>
        <a v-if="nextPage" :href="`#p-${currentPage + 1}`"
          class="hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full h-1.5em w-1.5em inline-flex items-center justify-center"
        ><i class="i-mage-chevron-right inline-block h-1em w-1em text-slate-800 dark:text-slate-100"></i></a>
      </div>
    </div>
    <template v-if="contacts && contacts.length">
      <div class="flex-1 overflow-y-auto py-2 scrollbar-thin">
        <div v-for="contact in contacts"
          class="flex items-center gap-3 px-2 py-1 my-1 first:mt-0 last:mb-0 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-md has-checked:bg-slate-400 dark:has-checked:bg-slate-800" :key="contact.resourceName as string"
        >
          <div class="w-auto flex-shrink-0 leading-none">
            <input type="checkbox" v-model="contactSelected" :value="contact.resourceName"
			  class="size-3.5 appearance-none rounded-sm border border-slate-400 accent-emerald-700 checked:appearance-auto dark:border-slate-400 dark:accent-emerald-300">
          </div>
          <img v-if="contact.photos && contact.photos.length" :src="contact.photos[0]?.url || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNcdQYAAiYBeL6Z75sAAAAASUVORK5CYII='" width="42" class="h-auto rounded-full shrink-0" loading="lazy">
          <div class="w-full"><router-link :to="`/contact/${contact.resourceName}`">{{ contactName(contact.names) }}</router-link></div>
          <div class="w-auto flex-shrink-0">{{ contact.phoneNumbers ? contact.phoneNumbers[0].canonicalForm:'' }}</div>
          <div class="w-auto flex-shrink-0">{{ contact.emailAddresses ? contact.emailAddresses[0]?.value:'' }}</div>
          <div class="w-auto flex-shrink-0 leading-none">
            <button type="button" class="bg-transparent text-red-700 dark:text-red-500" @click.prevent="delContact(contact.resourceName as string)">
              <i class="inline-block i-mage-trash-fill align-middle"></i>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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

const contacts         = ref<Person[]>()
const totalContacts    = ref<number>(0)
const currentPage      = ref<number>(0)
const nextPage         = ref<string|null>()
const pages            = ref<string[]>([''])
const errMsg           = ref<string>('')
const loading          = ref(true)
const responseStatus   = ref<number>()
const contactSelected  = ref<string[]>([])
const delBtnDisabled   = ref<boolean>(false)

const numFormat = (n: number): string => new Intl.NumberFormat().format(n)

const totalContact   = computed(() => {
  const p = (currentPage.value - 1) * 100
  const s = p + 1
  let n = p + (contacts.value?.length || 0)
  if (n > totalContacts.value){
    n = totalContacts.value
  }

  return `${numFormat(s)}&ndash;${numFormat(n)} of ${numFormat(totalContacts.value)}`
})

//const selectAllChecked = computed(() => contactSelected.value.length == contacts.value?.length)
const selectAll = computed({
  get: () => {
    return contacts.value ? contactSelected.value.length == contacts.value.length:false
  },
  set: (val) => {
    const s: string[] = []
    if (val && contacts.value){
      contacts.value.forEach(c => {
        s.push(c.resourceName as string)
      })
    }
    contactSelected.value = s
  }
})
//const delBtnDisabled = computed(() => contactSelected.value.length === 0)

const getCurrentPage = (): number => {
  let p = parseInt(route.hash.replace(/^#p-/, ''))
  if (p > 0){
    p = p - 1
  }

  return p
}

const contactName = (names) => {
  return names ? names[0].displayName:'NoName'
}

const getContacts = async () => {
  contactSelected.value = []
  errMsg.value  = ''
  loading.value = true
  let i = 0
  if (route.hash){
    i = getCurrentPage()
  }

  const pageToken = pages.value[i] || ''
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
    totalContacts.value = (response.contacts.totalItems || 0) as number

    if (response.contacts.nextPageToken && !pages.value.includes(response.contacts.nextPageToken)){
      pages.value.push(response.contacts.nextPageToken)
    }

    nextPage.value    = response.contacts.nextPageToken
    currentPage.value = i + 1
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

const delContact = (resourceName: string|undefined) => {
  if (resourceName){
    contactSelected.value.push(resourceName)
  }

  errMsg.value = ''
  loading.value = true
  delBtnDisabled.value = true
  fetch(`/api/g/contact`, {
    method: 'DELETE',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      authorization: `Bearer ${useAuth().accessToken.value}`
    },
    body: JSON.stringify({resourceName: contactSelected.value})
  }).then(response => {
    responseStatus.value = response.status
    return response.json<{status:number, message?: string, error?: boolean}>()
  }).then(async response => {
    if (response.status === 200){
      if (selectAll.value){
        await new Promise(r => setTimeout(r, 5000))

        const p = getCurrentPage()
        if (pages.value.length > 1){
          delete pages.value[p]
          pages.value = pages.value.filter(v => v !== undefined)
        }

		contacts.value = []
        nextPage.value = null

        getContacts()
        return
      } else {
        contacts.value = contacts.value?.filter((v) => !contactSelected.value.includes(v.resourceName as string))
      }

      contactSelected.value = []
    }
    loading.value = false
    if (response.error){
      errMsg.value = response.message || 'Error'
    }
  }).finally(() => {
    delBtnDisabled.value = false
  })
}

watch(() => route.hash, (newHash, oldHash) => {
  //console.log(newHash)
  //if (newHash){
    //currentPage.value = parseInt(newHash.replace(/^#p-/, '')) - 1
  //}
  getContacts()
})

onMounted(async () => {
  if (route.hash && pages.value.length < 2){
    router.replace({
      //name: 'g-contacts',
      hash: ''
    })
    return
  }
  /*
  if (route.hash){
    if (pages.value.length > 1){
      currentPage.value = parseInt(route.hash.replace(/^#p-/, '')) - 1
    } else {
      currentPage.value = 0
      router.replace({
        name: 'g-contacts',
        hash: ''
      })
      return
    }
  }
  */
  getContacts()
})

usePageTitle('Contacts List')
</script>
