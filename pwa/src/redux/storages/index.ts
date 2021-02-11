import { initializeStorage, JsonAccessor } from './accessor'

export const SESSION_STORAGE_ACCESSOR = initializeStorage(sessionStorage, [
  [2, (storageAdapter) => {
    const accessor = new JsonAccessor(storageAdapter)
    const VUEX_KEY = 'vuex'
    const vuex = accessor.get<{ session: { username: string | null } }>(VUEX_KEY)
    if (vuex !== null) {
      accessor.set('username', vuex.session.username)
    }
    accessor.del(VUEX_KEY)
  }]
])

export const LOCAL_STORAGE_ACCESSOR = initializeStorage(localStorage, [
  [2, (storageAdapter) => {
    const accessor = new JsonAccessor(storageAdapter)
    const VUEX_KEY = 'vuex'
    const vuex = accessor.get<{
      depot: {
        username: string | null;
        parametrization: string | null;
        authDigest: string | null;
        userKeys: string | null;
      }
    }>(VUEX_KEY)
    if (vuex !== null) {
      accessor.set('depot.username', vuex.depot.username)
      accessor.set('depot.salt', vuex.depot.parametrization)
      accessor.set('depot.hash', vuex.depot.authDigest)
      // Serialized and encrypted `Key[]`.
      accessor.set('depot.vault', vuex.depot.userKeys)
    }
    accessor.del(VUEX_KEY)
  }]
])
