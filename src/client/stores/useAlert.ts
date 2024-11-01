import { ref, reactive, computed } from 'vue'

type AlertData = {
  message?: string,
  autoclose?: number
}

const showAlert = ref<boolean>(false)
const alertData = reactive<AlertData>({})
const alertType = ref<string>()

export function useAlert(){

  function show(type:string, message:string, autoclose?: number){
    alertType.value     = type
    alertData.message   = message
    alertData.autoclose = autoclose

    showAlert.value     = true
  }

  function close(){
    alertType.value     = ''
    alertData.message   = undefined
    alertData.autoclose = undefined

    showAlert.value     = false
  }

  const type = computed(() => alertType.value)
  const message = computed(() => alertData.message)
  const autoclose = computed(() => alertData.autoclose)

  return {
    showAlert,
    type,
    message,
    autoclose,
    show,
    close
  }
}