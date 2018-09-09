import {state, mutations} from './root/core'
import actions from './root/actions'
import Interface from './modules/interface'
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const store = new Vuex.Store({
  state,
  mutations,
  actions,
  modules: {
    interface: Interface
  }
})

export default store
