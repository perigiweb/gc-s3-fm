<template>
  <router-view v-slot="{ Component }">
    <component :is="Component" :key="route.path" />
  </router-view>
</template>
<script setup lang="ts">
import { useHead, Title } from '@unhead/vue'
import { useRoute } from 'vue-router'
import { usePageTitle } from '../../stores/pagetitle'

const route = useRoute()
const p = usePageTitle('ObjectManager', 'ObjectManager - %s')

useHead({
  title: p.title as Title
})
</script>