import axios from 'axios'
import store from './store'
import {SESSION_LIFETIME_IN_MS, SESSION_TOKEN_HEADER_NAME} from './constants'
import {logOut} from './utilities'

export const applyShowToastOnRequestError = () => {
  axios.interceptors.response.use(undefined, (error) => {
    store.dispatch('interface/displaySnackbar', {
      message: `Error response: ${error.response.status}!`,
      timeout: 1500
    })
    return Promise.reject(error)
  })
}

export const applySendKeepAliveWhileIdle = () => {
  let keepAliveTimer = null

  const reScheduleTick = (immediate) => {
    clearTimeout(keepAliveTimer)
    keepAliveTimer = setTimeout(async () => {
      if (store.getters.hasSessionKey) {
        await axios.post('/api/administration/keep-alive', null, {
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: store.state.sessionKey
          }
        })
      }
    }, immediate ? 0 : SESSION_LIFETIME_IN_MS / 2)
  }

  axios.interceptors.request.use((configuration) => {
    if (configuration.headers.hasOwnProperty(SESSION_TOKEN_HEADER_NAME)) {
      reScheduleTick(false)
    }
    return configuration
  })

  store.subscribe((mutation) => {
    if (mutation.type === 'setSessionKey') {
      reScheduleTick(false)
    }
  })

  // This will go away once keys are renewed on refresh.
  if (store.getters.hasSessionKey) {
    reScheduleTick(true)
  }
}

export const applyLogOutWhenPageIsHidden = () => {
  let visibilityTimer = null

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      visibilityTimer = setTimeout(() => {
        if (store.getters.hasSessionKey) {
          logOut()
        }
      }, SESSION_LIFETIME_IN_MS)
    } else {
      clearTimeout(visibilityTimer)
    }
  })
}
