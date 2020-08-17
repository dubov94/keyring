import axios from 'axios'
import store from './store'
import { Status } from './store/root/status'
import {
  SESSION_LIFETIME_IN_MILLIS,
  SESSION_TOKEN_HEADER_NAME
} from './constants'
import { reloadPage } from './utilities'

export const applyGoOfflineOnRequestError = () => {
  axios.interceptors.response.use(undefined, (error) => {
    let message = 'Network is unavailable'
    if (error.response) {
      message = `Error code: ${error.response.status}`
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
