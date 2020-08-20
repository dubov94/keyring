import axios from 'axios'
import store from './store'
import { Status } from './store/root/status'

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
