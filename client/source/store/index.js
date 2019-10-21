import Interface from './modules/interface'
import Depot from './modules/depot'
import RootActions from './root/actions'
import RootGetters from './root/getters'
import RootMutations from './root/mutations'
import RootState from './root/state'
import Session from './modules/session'
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
  state: RootState,
  getters: RootGetters,
  mutations: RootMutations,
  actions: RootActions,
  modules: {
    interface: Interface,
    depot: Depot,
    session: Session
  }
})

export default store
