<template>
  <div class="py-4 text-center">
    <h1 class="text-4xl font-semibold font-sans mb-5">Welcome to Perigi Web Services</h1>
    <div v-if="isLoggedIn" class="mb-10">
      Your loggged in as <b>{{ authUser?.name }}</b> ({{ authUser?.email }})
    </div>
    <div v-else class="mb-10">
      <p>You can access our service after you logged in.</p>
      <p><a :href="`/auth/google?to=${route.fullPath}`" class="inline-block font-semibold font-sans bg-emerald-700 dark:bg-emerald-300 text-emerald-100 dark:text-emerald-900 px-5 py-2 rounded-3xl hover:bg-emerald-800 visited:bg-emerald-700 visited:text-emerald-100 dark:hover:bg-emerald-400 dark:hover:text-emerald-900 dark:visited:bg-emerald-300 dark:visited:text-emerald-900 hover:no-underline">Login with Google</a></p>
    </div>
    <h2 class="text-2xl font-sans font-semibold mb-3">Our Services Currently Available</h2>
    <div v-if="isLoggedIn" class="flex justify-center items-center gap-5">
      <RouterLink to="/contact">Google Contact Manager</RouterLink>
      <RouterLink to="/s3">S3 Object Manager</RouterLink>
    </div>
    <div v-else class="flex justify-center items-center gap-5">
      <h3 class="text-base">Google Contact Manager</h3>
      <h3 class="text-base">S3 Object Manager</h3>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../stores/auth'
import { usePageTitle } from '../stores/pagetitle'

const route = useRoute()
const { isLoggedIn, authUser } = useAuth()

const p = usePageTitle('PerigiWebServices', '%s')

useHead({
  title: 'Home of PerigiWebServices'
})
</script>
