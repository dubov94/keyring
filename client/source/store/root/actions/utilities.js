import {SESSION_TOKEN_HEADER_NAME} from '../../../constants'

export const createSessionHeader = (sessionKey) => ({
  [SESSION_TOKEN_HEADER_NAME]: sessionKey
})
