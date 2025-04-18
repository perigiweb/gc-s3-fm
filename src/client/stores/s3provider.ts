import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useAuth } from './auth'

import type { S3Provider } from '../../server/models/types'

const providers = ref<S3Provider[]>()

export function useProviderStore(autoload: boolean = true){
  const loading = ref<boolean>(false)
  const errMsg  = ref<string>()
  function fetchProviders()
  {
    const { accessToken } = useAuth()
    if (accessToken.value){
      errMsg.value = ''
      loading.value = true
      providers.value = undefined
      fetch('/api/s3', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken.value}`
        }
      }).then(async response => {
        //if (response.ok){
          return (await response.json()) as {status?: number, error?: boolean, message?: string, providers?: S3Provider[]}
        //}

        throw new Error(await response.text())
      }).then(r => {
        if (r.providers && r.providers.length){
          providers.value = r.providers
        } else {
          errMsg.value = r.message || 'No S3 providers!'
        }
      }).catch(err => {
        errMsg.value = err.message
      }).finally (() => {
        loading.value = false
      })
    }
  }
  if ( !providers.value && autoload){
    fetchProviders()
  }

  function getProvider(id: string|number) : ComputedRef<S3Provider|null> {
    return computed<S3Provider|null>(() => {
      return providers.value?.filter(p => p.id == id)[0] || null
    })
  }

  async function saveProvider(provider: S3Provider){
    const { accessToken } = useAuth()
    //const id = provider.id
    //delete provider.id
    return await fetch(`/api/s3`, {
      method: 'POST',
      body: JSON.stringify(provider),
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${accessToken.value}`
      }
    }).then(response => response.json<{error?: boolean, success?: boolean, fields?: Record<string, any>, message?: string, provider?: S3Provider}>())
  }

  async function deleteProvider(provider: string|string[]){
    const { accessToken } = useAuth()
    return await fetch(`/api/s3`, {
      method: 'DELETE',
      body: JSON.stringify({id: provider}),
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Bearer ${accessToken.value}`
      }
    }).then(response => response.json<{error?: boolean, success?: boolean, message?: string}>())
  }

  return {
    providers,
    loading,
    errMsg,
    getProvider,
    fetchProviders,
    saveProvider,
    deleteProvider
  }
}