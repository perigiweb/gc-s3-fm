import { ref } from 'vue'

const pageTitle = ref<string>()
const pageTitleTemplate = ref<string>()

export function usePageTitle(title?:string, template?:string){
  function set(title: string){
    if (pageTitleTemplate.value){
      title = pageTitleTemplate.value.replace('%s', title)
    }
    pageTitle.value = title
  }

  if(template){
    pageTitleTemplate.value = template
  }

  if (title && template){
    pageTitle.value = title
  } else if (title){
    set(title)
  }

  return {
    title: pageTitle,
    set
  }
}