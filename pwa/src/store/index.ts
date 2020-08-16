import { Depot } from './modules/depot'
import { Interface } from './modules/interface'
import { RootActions } from './root/actions'
import { getters } from './root/getters'
import { mutations } from './root/mutations'
import { Session } from './modules/session'
import { Threats } from './modules/threats'
import { RootState, FullState, constructInitialRootState } from './root/state'
import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersist from 'vuex-persist'
import { state$ } from './subject'

Vue.use(Vuex)

const vuexLocal = new VuexPersist<RootState>({
  storage: localStorage,
  reducer: (state) => {
    const fullState = state as FullState
    return {
      depot: {
        username: fullState.depot.username,
        parametrization: fullState.depot.parametrization,
        authDigest: fullState.depot.authDigest,
        userKeys: fullState.depot.userKeys
      }
    }
  }
})

const vuexSession = new VuexPersist<RootState>({
  storage: sessionStorage,
  modules: ['session']
})

const store = new Vuex.Store<RootState>({
  plugins: [vuexLocal.plugin, vuexSession.plugin],
  state: constructInitialRootState(),
  getters,
  mutations,
  actions: RootActions,
  modules: {
    depot: Depot,
    interface: Interface,
    session: Session,
    threats: Threats
  }
})

store.watch((state) => state as FullState, (value) => {
  state$.next(value)
}, { deep: true })

export default store
