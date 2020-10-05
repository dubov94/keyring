import { FetchAPI } from './definitions'
import { CLIENT_VERSION_HEADER_NAME } from '@/constants'
import camelcaseKeys from 'camelcase-keys'
import snakecaseKeys from 'snakecase-keys'

export const fetchFromApi: FetchAPI = (url: string, init: any = {}): Promise<Response> => {
  const headers = {
    [CLIENT_VERSION_HEADER_NAME]: window.globals.version,
    ...init.headers
  }
  const requestInit = { ...init, headers }
  if (init.body) {
    requestInit.body = JSON.stringify(
      snakecaseKeys(JSON.parse(init.body), { deep: true }))
  }
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
