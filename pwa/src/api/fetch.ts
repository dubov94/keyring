import { FetchAPI } from './definitions'
import { readFlags } from '@/flags'
import { CLIENT_VERSION_HEADER_NAME } from '@/headers'
import camelcaseKeys from 'camelcase-keys'
import snakecaseKeys from 'snakecase-keys'

export const fetchFromApi: FetchAPI = async (url: string, init: any = {}): Promise<Response> => {
  const headers = {
    [CLIENT_VERSION_HEADER_NAME]: readFlags().version,
    ...init.headers
  }
  const requestInit = { ...init, headers }
  if (init.body) {
    requestInit.body = JSON.stringify(
      snakecaseKeys(JSON.parse(init.body), { deep: true }))
  }
  const response: Response = await fetch(url, requestInit)
  const contentType = response.headers.get('Content-Type')
  if (contentType && contentType.includes('application/json')) {
    const json = await response.json()
    const message = camelcaseKeys(json, { deep: true })
    return new Response(JSON.stringify(message), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  }
  return response
}
