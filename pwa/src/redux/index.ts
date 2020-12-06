import { StorageManager } from './storages'
import { container } from 'tsyringe'
import { store } from './conjunction'
import { rehydrate } from './modules/session/actions'
import { apply, state$ } from './selectors'
import { REDUX_TOKEN } from './store_di'

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

container.register(REDUX_TOKEN, {
  useValue: store
})

store.subscribe(() => {
  state$.next(store.getState())
})

store.dispatch(rehydrate({
  username: sessionStorageManager.getObject<string>('username')
}))

apply((state) => state.session).subscribe((session) => {
  sessionStorageManager.setObject('username', session.username)
})
