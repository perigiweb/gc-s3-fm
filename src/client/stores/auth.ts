import { ref, computed } from 'vue'
import { decode } from 'hono/jwt'

export type AuthUser = {
  name: string,
  email: string,
  role: string,
  picture?: string|null
}

const TOKEN_KEY = 'prgAccessToken'
const accessToken = ref<string|null|undefined>(localStorage.getItem(TOKEN_KEY))
const tokenExpiredAt = ref<number>()
const authUser = ref<AuthUser>()

export function useAuth(){
  function decodeToken() {
    if (accessToken.value){
      const { payload } = decode(accessToken.value)
      if ('user' in payload){
        authUser.value = payload.user as AuthUser
      }
      tokenExpiredAt.value = payload.exp
    }
  }

  decodeToken()

  async function getTokenFromCode(code: string){
    const response = await fetch('/auth/token', {
      method: 'POST',
      body: JSON.stringify({code}),
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json'
      }
    }).then(async response => {
      return (await response.json()) as {accessToken?: string|null, error?: boolean, message?: string, status: number}
    })

    if ('accessToken' in response && response.accessToken){
      accessToken.value = response.accessToken
      localStorage.setItem(TOKEN_KEY, accessToken.value)
      decodeToken()
    }

    return response
  }

  function removeToken(){
    accessToken.value = undefined
    localStorage.removeItem(TOKEN_KEY)
  }

  const isLoggedIn = computed(() => {
    if (accessToken.value && tokenExpiredAt.value && Math.floor(Date.now()/1e3) < tokenExpiredAt.value){
      return true
    }

    removeToken()
    return false
  })

  return {
    accessToken,
    authUser,
    getTokenFromCode,
    isLoggedIn
  }
}