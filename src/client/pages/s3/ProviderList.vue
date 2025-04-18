<template>
  <div class="py-2">
    <div class="flex flex-col gap-4 flex-wrap">
      <div v-if="showForm" class="w-480px mx-auto rounded bg-slate-300 dark:bg-slate-800 border border-slate-400 dark:border-slate-600">
        <div class="py-2 px-4 border-b border-slate-400 dark:border-slate-600 flex justify-between items-center">
          <h2 class="font-sans font-semibold">Add New S3 Provider</h2>
          <button type="button" @click.prevent="hideForm" class="bg-transparent text-slate-400 text-xl leading-none align-top font-semibold pb-2">&times;</button>
        </div>
        <div class="py-4 px-4">
          <div v-if="saveErrMsg" class="bg-red-300 text-red-900 px-4 py-2 rounded mb-4">{{ saveErrMsg }}</div>
          <form @submit.prevent="submitProvider" method="post" class="flex flex-col gap-3 group" novalidate>
            <div class="flex flex-col gap-1">
              <label for="name" class="text-xs color-slate-600 dark:color-slate-400">Provider Name <span class="text-red-700 dark:text-red-300">*required</span></label>
              <input id="name" v-model="provider.name" required type="text" :class="inputTextClass" />
              <div class="hidden text-red-700 dark:text-red-300 text-sm group-[.was-validated]:peer-invalid:block group-[.was-validated]:peer-valid:hidden">{{ errors?.name[0]||'Name is required.' }}</div>
            </div>
            <div class="flex flex-col gap-1">
              <label for="website" class="text-xs color-slate-600 dark:color-slate-400">Provider Website</label>
              <input id="website" v-model="provider.website" type="text" :class="inputTextClass" />
            </div>
            <h3 class="leading-none mt-5 font-sans font-semibold pb-2 border-b border-slate-400 dark:border-slate-600">Detail API</h3>
            <div class="flex flex-col gap-1">
              <label for="accessKeyId" class="text-xs color-slate-600 dark:color-slate-400">Access Key Id <span class="text-red-700 dark:text-red-300">*required</span></label>
              <input id="accessKeyId" v-model="provider.accessKeyId" required type="text" :class="inputTextClass" autocomplete="off" />
              <div class="hidden text-red-700 dark:text-red-300 text-sm group-[.was-validated]:peer-invalid:block group-[.was-validated]:peer-valid:hidden">{{ errors?.accessKeyId[0]||'Access Key Id is required.' }}</div>
            </div>
            <div class="flex flex-col gap-1">
              <label for="accessSecretKey" class="text-xs color-slate-600 dark:color-slate-400">Access Secret Key <span class="text-red-700 dark:text-red-300">*required</span></label>
              <input id="accessSecretKey" v-model="provider.accessSecretKey" required type="text" :class="inputTextClass" autocomplete="off" />
              <div class="hidden text-red-700 dark:text-red-300 text-sm group-[.was-validated]:peer-invalid:block group-[.was-validated]:peer-valid:hidden">{{ errors?.accessKeyId[0]||'Access Secret Key is required.' }}</div>
            </div>
            <div class="flex flex-col gap-1">
              <label for="region" class="text-xs color-slate-600 dark:color-slate-400">Region <span class="text-red-700 dark:text-red-300">*required</span></label>
              <input id="region" v-model="provider.region" type="text" required :class="inputTextClass" />
              <div class="hidden text-red-700 dark:text-red-300 text-sm group-[.was-validated]:peer-invalid:block group-[.was-validated]:peer-valid:hidden">{{ errors?.accessKeyId[0]||'Region is required.' }}</div>
            </div>
            <div class="flex flex-col gap-1">
              <label for="endpoint" class="text-xs color-slate-600 dark:color-slate-400">API Endpoint <span class="text-red-700 dark:text-red-300">*required</span></label>
              <input id="endpoint" v-model="provider.endpoint" type="text" required :class="inputTextClass" pattern="^(http|https):\/\/.*" />
              <div class="hidden text-red-700 dark:text-red-300 text-sm group-[.was-validated]:peer-invalid:block group-[.was-validated]:peer-valid:hidden">{{ errors?.accessKeyId[0]||"API Endpoint is required &amp; must start with 'http://' or 'https://'." }}</div>
            </div>
            <div class="flex flex-col gap-1">
              <label for="bucket" class="text-xs color-slate-600 dark:color-slate-400">Bucket Name</label>
              <input id="bucket" v-model="provider.bucket" type="text" :class="inputTextClass" />
              <div class="text-xs color-slate-600 dark:color-slate-400">Optional, fill the bucket name, if AccessKey is only valid for one bucket.</div>
            </div>
            <div class="flex flex-col gap-1">
              <label for="bucket" class="text-xs color-slate-600 dark:color-slate-400">Public URL Template <span class="text-red-700 dark:text-red-300">*required</span></label>
              <input id="bucket" required v-model="provider.objectBaseUrl" type="text" :class="inputTextClass" pattern="^(http|https):\/\/.*" />
              <div class="hidden text-red-700 dark:text-red-300 text-sm group-[.was-validated]:peer-invalid:block group-[.was-validated]:peer-valid:hidden">{{ errors?.accessKeyId[0]||"Public URL Template is required &amp; must start with 'http://' or 'https://'." }}</div>
              <div class="text-xs color-slate-600 dark:color-slate-400 mt-1">Optional, base url for the object.<br/>Example <code>https://{bucket}.s3.{region}.s3provider.com/{objectKey}</code></div>
            </div>
            <div class="mt-3 border-t border-slate-400 dark:border-slate-600 pt-4">
              <button type="submit"
                class="bg-emerald-700 dark:bg-emerald-300 text-emerald-100 dark:text-emerald-950 hover:bg-emerald-800 dark:hover:bg-emerald-400 disabled:bg-emerald-600 disabled:dark:bg-emerald-600 disabled:text-emerald-700 disabled:dark:text-emerald-800 rounded px-8 py-2 font-semibold"
                :disabled="isSaving"
              >{{ saveBtnText }}</button>
            </div>
          </form>
        </div>
      </div>
      <div v-else class="flex flex-col gap-4 flex-wrap">
        <div class="text-left">
          <button type="button" @click.prevent="showForm = true"
            class="bg-emerald-700 dark:bg-emerald-300 text-emerald-100 dark:text-emerald-900 hover:bg-emerald-800 dark:hover:bg-emerald-400 rounded-2xl px-4 py-2 text-sm font-semibold"
          ><i class="i-mage-plus inline-block"></i><span class="inline-block ml-1">Add S3 Provider</span></button>
        </div>
        <div v-if="errMsg" class="bg-red-300 text-red-900 px-4 py-2 rounded">{{ errMsg }}</div>
        <div v-if="loading" class="text-center text-sm">Loading...</div>
        <template v-if="providers" v-for="_provider in providers" :key="_provider.id">
          <div class="px-4 py-3 bg-slate-300 dark:bg-slate-700 rounded text-sm flex justify-between items-center gap-4">
            <div class="font-semibold flex-1 flex items-center gap-3">
              <span class="inline-block">{{ _provider.name }}</span>
              <a v-if="_provider.website" :href="_provider.website" target="_blank" class="underline">{{ _provider.website }}</a>
            </div>
            <div v-if="_provider.bucket" class="shrink-0 text-nowrap">{{ _provider.bucket }}</div>
            <div class="w-auto shrink-0 text-right">
              <RouterLink :to="`/s3/${_provider.id}${_provider.bucket ? '/'+_provider.bucket:''}`" class="text-nowrap">{{ _provider.bucket ? 'Objects List':'Buckets List' }}</RouterLink>
            </div>
            <div class="shrink-0 flex items-center gap-2">
              <button type="button" class="bg-transparent leading-none" @click.prevent="edit(_provider)"><i class="inline-block i-mage-edit-fill align-middle"></i></button>
              <button type="button" class="bg-transparent text-red-700 dark:text-red-500 leading-none" @click.prevent="del(_provider.id)"><i class="inline-block i-mage-trash-fill align-middle"></i></button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'

import type { S3Provider } from '../../../server/models/types'
import { useProviderStore } from '../../stores/s3provider'
import { usePageTitle } from '../../stores/pagetitle'
import { useAlert } from '../../stores/useAlert'

usePageTitle('S3 Providers List')

const {loading, errMsg, providers, fetchProviders, saveProvider, deleteProvider} = useProviderStore(false)
const showForm = ref<boolean>(false)
const isSaving = ref<boolean>(false)
const saveErrMsg = ref<string>()
const provider = reactive<S3Provider>({
  id: '',
  name: '',
  website: '',
  accessKeyId: '',
  accessSecretKey: '',
  region: '',
  endpoint: '',
  bucket: '',
  objectBaseUrl: ''
})
const errors = ref<Record<string, any>>()
const inputTextClass = 'peer rounded px-3 py-2 border border-slate-500 dark:border-slate-500 bg-slate-200 dark:bg-slate-900 w-full text-sm group-[.was-validated]:invalid:border-red-600 dark:group-[.was-validated]:invalid:border-red-400 group-[.was-validated]:valid:border-emerald-600 dark:group-[.was-validated]:valid:border-emerald-400'
const saveBtnText = computed(() => isSaving.value ? 'Saving...':'Save')

const submitProvider = async (event: any) => {
  saveErrMsg.value = ''
  if ( !event.target.checkValidity()){
    event.target.classList.add('was-validated')
    event.target.querySelector(':invalid').focus()
    return false
  }

  isSaving.value = true
  const res = await saveProvider(provider)
  isSaving.value = false
  if (res.success){
    useAlert().show('success', 'S3 Provider has been successfully saved.', 5)
    hideForm()
    fetchProviders()
  }
  if (res.error){
    if (res.fields){
      //errors.value = res.fields
    } else if (res.message){
      useAlert().show('error', res.message, 5)
    }
  }
}

const hideForm = () => {
  showForm.value = false
  provider.id              = ''
  provider.name            = ''
  provider.website         = ''
  provider.accessKeyId     = ''
  provider.accessSecretKey = ''
  provider.region          = ''
  provider.endpoint        = ''
  provider.bucket          = ''
  provider.objectBaseUrl   = ''
}

const edit = (p: Partial<S3Provider>) => {
  Object.keys(provider).forEach(k => {
    // @ts-ignore
    provider[k as keyof S3Provider] = p[k as keyof S3Provider]
  })
  showForm.value = true
}

const del = async (p?: string|string[]) => {
  if (p){
    const r = await deleteProvider(p)
    if (r.success){
      useAlert().show('success', 'S3 Provider has been successfully deleted.', 5)
      fetchProviders()
    }
  }
}

onMounted(() => {
  fetchProviders()
})
</script>