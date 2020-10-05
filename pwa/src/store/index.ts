import { Depot, depotBit$ } from './root/modules/depot'
import { Interface } from './root/modules/interface'
import { Mutations } from './root'
import { RootState, FullState, constructInitialRootState, getDepotEssense } from './state'
import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersist from 'vuex-persist'
import { state$ } from './state_rx'
import { container } from 'tsyringe'
import { STORE_TOKEN } from './store_di'
import { User } from './root/modules/user/module'
import { Session } from './root/modules/session'
import { persistanceBits } from './storages'

Vue.use(Vuex)

const vuexLocal = new VuexPersist<RootState>({
  storage: localStorage,
  filter: () => persistanceBits.local,
  reducer: (state) => {
    const fullState = state as FullState
    return {
      depot: getDepotEssense(fullState.depot)
    }
  }
})

const vuexSession = new VuexPersist<RootState>({
  storage: sessionStorage,
  modules: ['session'],
  filter: () => persistanceBits.session
})

const store = new Vuex.Store<RootState>({
  plugins: [vuexLocal.plugin, vuexSession.plugin],
  state: constructInitialRootState,
  mutations: Mutations,
  modules: {
    depot: Depot,
    interface: Interface,
    user: User,
    session: Session
  }
})

container.register(STORE_TOKEN, {
  useValue: store
})

store.watch((state) => state as FullState, (value) => {
  // https://github.com/vuejs/Discussion/issues/292
  state$.next(JSON.parse(JSON.stringify(value)))
}, { deep: true, immediate: true })

;(async () => {
  await ((store as any).restored as Promise<void>)
  depotBit$.next((store.state as FullState).depot.username !== null)
})()
