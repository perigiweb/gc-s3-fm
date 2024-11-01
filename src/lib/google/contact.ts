import { ListConnectionsResponse, Person, PersonResponse } from './contact.types'

export enum SortOrder {
  LAST_MODIFIED_ASCENDING,
  LAST_MODIFIED_DESCENDING,
  FIRST_NAME_ASCENDING,
  LAST_NAME_ASCENDING
}

export type ListContactOptions = {
  personFields?: string[],
  pageSize?: number,
  pageToken?: string,
  sortOrder?: SortOrder,
}

function toQueryString(params: { [key: string]: any }) : string {
  const elements = Object.keys(params)

  elements.forEach((element) => {
    if (params[element] === undefined) {
      delete params[element]
    }
  })

  return new URLSearchParams(params).toString()
}

export class GoogleContact {

  baseUri: string = 'https://people.googleapis.com/v1'
  token: string

  constructor(token: string){
    this.token = token
  }

  async getContacts(options : ListContactOptions) : Promise<ListConnectionsResponse> {
    const opts: ListContactOptions = {
      personFields: ['names', 'nicknames', 'emailAddresses', 'coverPhotos', 'phoneNumbers', 'photos'],
      pageSize: 100,
      sortOrder: SortOrder.LAST_MODIFIED_DESCENDING
    }

    if (options.personFields !== undefined){
      opts.personFields = options.personFields
    }
    if (options.pageSize !== undefined){
      opts.pageSize = options.pageSize
    }
    if (options.pageToken !== undefined){
      opts.pageToken = options.pageToken
    }
    if (options.sortOrder !== undefined){
      opts.sortOrder = options.sortOrder
    }

    const qs = toQueryString(opts)
    const apiUrl = `${this.baseUri}/people/me/connections?${qs}`

    const response = (await fetch(apiUrl, {
      headers: {
        authorization: `Bearer ${this.token}`
      }
    }).then(resp => resp.json())) as ListConnectionsResponse

    return response
  }

  async createContact(person: Person){
    const response = await fetch(`${this.baseUri}/people:createContact`, {
      method: 'POST',
      body: JSON.stringify(person),
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${this.token}`
      }
    }).then(resp => resp.json())

    return response
  }
}