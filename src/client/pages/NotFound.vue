<template>
  <div class="text-center my-6">
    <h1 class="font-size-10 font-semibold font-sans">Page Not Found</h1>
    <p>The page you are requested (<code class="text-slate-500">{{ $route.path }}</code>) is not found.</p>
    <p><router-link :to="{name: 'home'}">&laquo; back to Home</router-link></p>
  </div>
</template>
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'

useHead({
  title: 'Page Not Found'
})
</script>