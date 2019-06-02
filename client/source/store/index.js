import {state, getters, mutations} from './root/core'
import actions from './root/actions'
import Interface from './modules/interface'
import Depot from './modules/depot'
import Session from './modules/session'
import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersist from 'vuex-persist'

Vue.use(Vuex)

const vuexLocal = new VuexPersist({
  storage: localStorage,
  modules: ['depot']
})

const vuexSession = new VuexPersist({
  storage: sessionStorage,
  modules: ['session']
})

const store = new Vuex.Store({
  plugins: [vuexLocal.plugin, vuexSession.plugin],
  state,
  getters,
  mutations,
  actions,
  modules: {
    interface: Interface,
    depot: Depot,
    session: Session
  }
})

export default store
