<template>
  <Header />
  <div class="container mx-auto py-6 flex-1 mt-48px">
    <router-view v-slot="{ Component }">
      <component :is="Component" :key="$route.path" />
    </router-view>
  </div>
  <alert v-if="alert.showAlert.value" :type="alert.type.value" :autoclose="alert.autoclose.value" @close="alert.close">{{ alert.message }}</alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'

import Header from './components/Header.vue'
import Alert from './components/Alert.vue'

import { useTheme } from './stores/theme'
import { useAlert } from './stores/useAlert'

const alert = useAlert()

useHead({
  bodyAttrs: {
    class: 'font-sans bg-slate-200 dark:bg-slate-900 text-slate-950 dark:text-slate-100'
  },
  htmlAttrs: {
    class: computed(() => useTheme().theme.value)
  }
})
</script>