import {state, getters, mutations} from './root/core'
import actions from './root/actions'
import Interface from './modules/interface'
import Preferences from './modules/preferences'
import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersist from 'vuex-persist'
import {SESSION_LIFETIME_IN_MS} from '../constants'
import axios from 'axios'

Vue.use(Vuex)

const vuexLocal = new VuexPersist({
  storage: localStorage,
  modules: ['preferences']
})

const stateKeys = Object.keys(state)

const vuexSession = new VuexPersist({
  storage: sessionStorage,
  reducer: (object) => stateKeys.reduce((accumulator, current) => {
    accumulator[current] = object[current]
    return accumulator
  }, {})
})

const heartBeatPlugin = (store) => {
  let identifier = null

  const scheduleBeat = () => {
    clearTimeout(identifier)
    identifier = setTimeout(async () => {
      await axios.put('/api/authentication/keep-alive', {
        session_key: store.state.sessionKey
      })
      scheduleBeat()
    }, SESSION_LIFETIME_IN_MS / 2)
  }

  if (store.getters.hasSessionKey) {
    scheduleBeat()
  }

  store.subscribe((mutation) => {
    if (mutation.type === 'setSessionKey') {
      scheduleBeat()
    }
  })
}

const store = new Vuex.Store({
  plugins: [vuexLocal.plugin, vuexSession.plugin, heartBeatPlugin],
  state,
  getters,
  mutations,
  actions,
  modules: {
    interface: Interface,
    preferences: Preferences
  }
})

export default store
