import { Depot } from './modules/depot'
import { Interface } from './modules/interface'
import { RootActions } from './root/actions'
import { getters } from './root/getters'
import { mutations } from './root/mutations'
import { Session } from './modules/session'
import { Threats } from './modules/threats'
import { RootState, StateAssembly, constructInitialState } from './root/state'
import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersist from 'vuex-persist'
import { Subject } from 'rxjs'

Vue.use(Vuex)

const vuexLocal = new VuexPersist<RootState>({
  storage: localStorage,
  reducer: (state) => {
    const assembly = state as StateAssembly
    return {
      depot: {
        username: assembly.depot.username,
        parametrization: assembly.depot.parametrization,
        authDigest: assembly.depot.authDigest,
        userKeys: assembly.depot.userKeys
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
  state: constructInitialState(),
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

const state$ = new Subject<StateAssembly>()
store.watch((state) => state as StateAssembly, (value) => {
  state$.next(value)
})

export default store
