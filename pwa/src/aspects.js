import axios from 'axios'
import store from './store'
import { Status } from './store/root/status'
import {
  SESSION_LIFETIME_IN_MILLIS,
  SESSION_TOKEN_HEADER_NAME
} from './constants'
import { reloadPage } from './utilities'

export const applyAttachVersionHeaderOnRequest = () => {
  axios.interceptors.request.use((configuration) => {
    if (configuration.url.startsWith('/api')) {
      configuration.headers['X-Client-Version'] = window.globals.version
    }
    return configuration
  })
}

export const applyGoOfflineOnRequestError = () => {
  axios.interceptors.response.use(undefined, (error) => {
    let message = 'Network is unavailable'
    if (error.response) {
      let { status } = error.response
      if (status === 501) {
        message = `The application is outdated. Please refresh!`
      } else {
        message = `Error status code: ${status}`
      }
    }
    store.commit('setStatus', Status.OFFLINE)
    store.commit('setSessionKey', null)
    store.dispatch('interface/displaySnackbar', {
      message: message,
      timeout: 1500
    })
    return Promise.reject(error)
  })
}

export const applySendKeepAliveWhileIdle = () => {
  let keepAliveTimer = null

  const reScheduleTick = () => {
    clearTimeout(keepAliveTimer)
    keepAliveTimer = setTimeout(async () => {
      if (store.getters.hasSessionKey) {
        await axios.post('/api/administration/keep-alive', null, {
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: store.state.sessionKey
          }
        })
      }
    }, SESSION_LIFETIME_IN_MILLIS / 2)
  }

  axios.interceptors.response.use((response) => {
    if (Object.prototype.hasOwnProperty.call(
      response.config.headers, SESSION_TOKEN_HEADER_NAME)) {
      reScheduleTick()
    }
    return response
  })

  store.subscribe((mutation) => {
    if (mutation.type === 'setSessionKey') {
      reScheduleTick()
    }
  })
}

export const applyFreezeWhenPageIsHidden = () => {
  let visibilityTimer = null

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      visibilityTimer = setTimeout(() => {
        if (store.getters.isUserActive) {
          reloadPage()
        }
      }, SESSION_LIFETIME_IN_MILLIS)
    } else {
      clearTimeout(visibilityTimer)
    }
  })
}
