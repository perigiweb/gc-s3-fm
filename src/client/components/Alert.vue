<template>
  <div class="fixed top-6 max-w-400px z-9000 right-50% translate-x-50%">
    <div :class="alertClass">
      <div class="flex-1"><slot>{{ message }}</slot></div>
      <button type="button" @click.prevent="$emit('close')"
        class="text-base leading-none font-semibold bg-transparent border-0"
      >&times;</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{type?: string, autoclose?: number, message?: string}>()
const emit  = defineEmits(['close'])

const alertClass = computed(() => {
  let c = 'pl-4 pr-2 py-2 text-sm rounded w-auto mx-auto flex gap-4 justify-between items-start'
  switch(props.type){
    case 'error':
      c = `${c} bg-red-300 text-red-900`
    break
    case 'success':
      c = `${c} bg-emerald-300 text-emerald-900`
    break
    case 'warning':
      c = `${c} bg-amber-300 text-amber-900`
    break;
  }

  return c
})

if (props.autoclose){
  let timeOut = props.autoclose
  if (timeOut >= 0){
    setTimeout(() => {
      emit('close')
    }, timeOut * 1000)
  }
}
</script>