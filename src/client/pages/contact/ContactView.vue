<template>
<div v-if="loading" class="text-center">Loading...</div>
<div v-if="contact"><pre>{{ contact }}</pre></div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePageTitle } from '../../stores/pagetitle'
import { useAuth } from '../../stores/auth'

import { Person } from '../../../lib/google/contact.types'

const route   = useRoute()

const contact = ref<Person>()
const loading = ref(true)

const getContact = () => {
  fetch(`/api/g/contact/${route.params.contactId}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${useAuth().accessToken.value}`
    }
  }).then(response => response.json()).then(response => {
    console.log(response)
    if (response.status === 200){
      contact.value = response.contact
    }
  }).finally(() => {
    loading.value = false
  })
}

onMounted(() => {
  getContact()
})

usePageTitle('Contact View')
</script>
