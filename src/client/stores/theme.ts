import { ref } from 'vue'

const theme = ref<string>(localStorage.getItem('prgTheme') || 'dark')

export function useTheme(){
  function toggleTheme(){
    theme.value = theme.value === 'dark' ? 'light':'dark'
    localStorage.setItem('prgTheme', theme.value)
  }

  return {
    theme,
    toggleTheme
  }
}