export function getToken () : string|null {
  // @ts-ignore
  return localStorage.getItem('pomAuth')
}

export function setToken (v:string){
  // @ts-ignore
  localStorage.setItem('pomAuth', v)
}

export const fmtDate = (d : string|Date) : string => {
  if (typeof d === "string"){
    d = new Date(Date.parse(d as string))
  }

  //return Intl.DateTimeFormat(navigator.language).format(d)
  return d.toLocaleString(navigator.language, {
    day: 'numeric',
    year: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short'
  })
}

export const fmtBytes = (bytes : number, decimals: number|undefined) : string => {
  if(bytes == 0) return '0 B';
  const k = 1000,
    dm = decimals || 2,
    sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}