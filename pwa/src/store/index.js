import Depot from './modules/depot'
import Interface from './modules/interface'
import RootActions from './root/actions'
import RootGetters from './root/getters'
import RootMutations from './root/mutations'
import { INITIAL_STATE } from './root/state'
import Session from './modules/session'
import Threats from './modules/threats'
import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersist from 'vuex-persist'

Vue.use(Vuex)

const vuexLocal = new VuexPersist({
  storage: localStorage,
  reducer: (state) => ({
    depot: {
      username: state.depot.username,
      parametrization: state.depot.parametrization,
      authDigest: state.depot.authDigest,
      userKeys: state.depot.userKeys
    }
  })
})

const vuexSession = new VuexPersist({
  storage: sessionStorage,
  modules: ['session']
})

const store = new Vuex.Store({
  plugins: [vuexLocal.plugin, vuexSession.plugin],
  state: INITIAL_STATE,
  getters: RootGetters,
  mutations: RootMutations,
  actions: RootActions,
  modules: {
    depot: Depot,
    interface: Interface,
    session: Session,
    threats: Threats
  }
})

export default store
