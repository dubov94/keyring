import { Depot, depotBit$ } from './root/modules/depot'
import { Interface } from './root/modules/interface'
import { Mutations } from './root'
import { RootState, FullState, constructInitialRootState, getDepotEssense, ReduxFullState } from './state'
import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersist from 'vuex-persist'
import { applySelector, reduxState$, state$ } from './state_rx'
import { container } from 'tsyringe'
import { REDUX_STORE_TOKEN, STORE_TOKEN } from './store_di'
import { User } from './root/modules/user/module'
import { sessionSlice } from './root/modules/session'
import { persistanceBits, StorageManager } from './storages'
import { configureStore } from '@reduxjs/toolkit'
import { SESSION_STORAGE_MANAGER_TOKEN } from './storages_di'

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

const store = new Vuex.Store<RootState>({
  plugins: [vuexLocal.plugin],
  state: constructInitialRootState,
  mutations: Mutations,
  modules: {
    depot: Depot,
    interface: Interface,
    user: User
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
  if ((store.state as FullState).depot.username !== null) {
    depotBit$.next(true)
  }
})()

const sessionStorageManager = new StorageManager(sessionStorage, [
  [2, (get, set, remove) => {
    const VUEX_KEY = 'vuex'
    const vuex = get<{ session: { username: string | null } }>(VUEX_KEY)
    if (vuex !== null) {
      set('username', vuex.session.username)
    }
    remove(VUEX_KEY)
  }]
])
sessionStorageManager.open()
container.register(SESSION_STORAGE_MANAGER_TOKEN, {
  useValue: sessionStorageManager
})

const reduxStore = configureStore<ReduxFullState>({
  reducer: {
    session: sessionSlice.reducer
  }
})
container.register(REDUX_STORE_TOKEN, {
  useValue: reduxStore
})

reduxStore.subscribe(() => {
  reduxState$.next(reduxStore.getState())
})

reduxStore.dispatch(sessionSlice.actions.rehydrate({
  username: sessionStorageManager.getObject<string>('username')
}))

applySelector((state) => state.session).subscribe((session) => {
  sessionStorageManager.setObject('username', session.username)
})
