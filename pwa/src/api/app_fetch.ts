import { FetchAPI } from './api'
import { CLIENT_VERSION_HEADER_NAME } from '@/constants'
import camelcaseKeys from 'camelcase-keys'

export const fetchFromApi: FetchAPI = (url: string, init: any = {}): Promise<Response> => {
  const headers = Object.assign({}, {
    [CLIENT_VERSION_HEADER_NAME]: window.globals.version
  }, init.headers)
  const requestInit = Object.assign({}, init, { headers })
  return fetch(url, requestInit).then(async (value: Response) => {
    const contentType = value.headers.get('Content-Type')
    if (contentType && contentType.includes('application/json')) {
      const json = await value.json()
      const response = camelcaseKeys(json, { deep: true })
      return new Response(JSON.stringify(response), {
        status: value.status,
        statusText: value.statusText,
        headers: value.headers
      })
    } else {
      return value
    }
  })
}
