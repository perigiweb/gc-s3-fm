<template>
  <div class="py-2 border-b border-solid border-slate-400 dark:border-slate-700 bg-slate-300 dark:bg-slate-800 fixed left-0 right-0 top-0 h-48px flex items-center z-100">
    <div class="container flex justify-between items-center gap-3 mx-auto">
      <div class="align-middle">
        <RouterLink v-if="!isHome" to="/" class="text-lg mr-2 inline-block align-middle"><i class="inline-block i-mage-home-3-fill"></i></RouterLink>
        <h1 class="font-semibold font-jost font-sans text-base inline-block">{{ title || 'PerigiWebServices' }}</h1>
      </div>
      <div class="flex justify-right items-center gap-3">
        <button type="button" @click.prevent="toggleTheme"
          class="bg-slate-800 dark:bg-slate-300 text-slate-100 dark:text-slate-900 rounded-full text-sm w-1rem h-1rem"
        ><span :class="`inline-block ${theme === 'dark' ? 'i-mage-moon-fill':'i-mage-sun-fill'}`"></span>
        </button>
        <div v-if="authUser" class="flex items-center gap-2">
          <div class="leading-none text-right">
            <span class="inline-block font-semibold text-sm align-middle">{{ authUser.name }}</span>
            <button class="inline-block text-sm ml-2 i-mage-logout align-middle"></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePageTitle } from '../stores/pagetitle'
import { useTheme } from '../stores/theme'
import { useAuth } from '../stores/auth'

const router = useRoute()
const { title } = usePageTitle()
const { theme, toggleTheme } = useTheme()
const { authUser } = useAuth()

const isHome = computed(() => router.name === 'home')
</script>