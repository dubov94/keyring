import { StorageManager } from './storages'
import { store } from './store'
import { rehydrate } from './modules/session/actions'
import { apply } from './selectors'

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

store.dispatch(rehydrate({
  username: sessionStorageManager.getObject<string>('username')
}))

apply((state) => state.session).subscribe((session) => {
  sessionStorageManager.setObject('username', session.username)
})
