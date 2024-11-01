<template>
  <div v-if="authErrMsg" class="py-4">
    <div class="bg-red-300 text-red-900 px-4 py-2 rounded mb-6">{{ authErrMsg }}</div>
    <p><router-link :to="{name: 'home'}">&laquo; back to Home</router-link></p>
  </div>
  <div v-else class="text-center text-sm py-4">Getting access token. Please wait...</div>
</template>
<script setup lang="ts">
import { ref, onMounted, watchEffect } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'

const router = useRouter()
const route  = useRoute()
const { accessToken, getTokenFromCode } = useAuth()

const redirectTo = route.params.to ? (Array.isArray(route.params.to) ? route.params.to[0]:route.params.to):'/'
watchEffect(() => {
  if (accessToken.value){
    router.push(redirectTo)
    //console.log('loggedIn')
  }
})

const authErrMsg = ref<string>()
onMounted(async () => {
  if ( !accessToken.value && route.query.code){
    const code = (Array.isArray(route.query.code) ? route.query.code[0]:route.query.code) as string
    const r = await getTokenFromCode(code)
    if (r.error){
      authErrMsg.value = r.message || 'Unknown error.'
    }
  }
})

useHead({
  title: 'Getting Authorization Token...'
})
</script>