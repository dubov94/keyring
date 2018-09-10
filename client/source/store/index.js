import {state, mutations} from './root/core'
import actions from './root/actions'
import Interface from './modules/interface'
import Preferences from './modules/preferences'
import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersist from 'vuex-persist'

Vue.use(Vuex)

let vuexLocal = new VuexPersist({
  modules: ['preferences']
})

const store = new Vuex.Store({
  plugins: [vuexLocal.plugin],
  state,
  mutations,
  actions,
  modules: {
    interface: Interface,
    preferences: Preferences
  }
})

export default store
