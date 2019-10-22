import axios from 'axios'
import router from './router'
import store from './store'
import Status from './store/root/status'
import {
  SESSION_LIFETIME_IN_MILLIS,
  SESSION_TOKEN_HEADER_NAME
} from './constants'
import { reloadPage } from './utilities'

export const applySaveRouteOnNavigation = () => {
  router.afterEach((to, from) => {
    if (!to.meta.interstitial) {
      store.commit('session/setLastRoute', to.path)
    }
  })
}

export const applyAttachVersionHeaderOnRequest = () => {
  axios.interceptors.request.use((configuration) => {
    configuration.headers['X-Client-Version'] = window.globals.version
    return configuration
  })
}

export const applyGoOfflineOnRequestError = () => {
  axios.interceptors.response.use(undefined, (error) => {
    let message = 'Network is unavailable'
    if (error.response) {
      message = `Error response: ${error.response.status}!`
    }
    store.commit('setStatus', Status.OFFLINE)
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
    if (response.config.headers.hasOwnProperty(SESSION_TOKEN_HEADER_NAME)) {
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
