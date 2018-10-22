export const state = {
  salt: null,
  encryptionKey: null,
  sessionKey: null,
  userKeys: []
}

export const getters = {
  hasSessionKey: (state) => state.sessionKey !== null
}

export const mutations = {
  setSalt (state, salt) {
    state.salt = salt
  },
  setSessionKey (state, sessionKey) {
    state.sessionKey = sessionKey
  },
  setEncryptionKey (state, encryptionKey) {
    state.encryptionKey = encryptionKey
  },
  setUserKeys (state, userKeys) {
    state.userKeys.length = 0
    for (let item of userKeys) {
      state.userKeys.push(item)
    }
    state.userKeys.sort((left, right) => {
      let leftTagCount = left.tags.length
      let rightTagCount = right.tags.length
      if (leftTagCount > 0 && rightTagCount > 0) {
        return left.tags[0].localeCompare(right.tags[0])
      } else if (leftTagCount > 0 && rightTagCount === 0) {
        return -1
      } else if (leftTagCount === 0 && rightTagCount > 0) {
        return 1
      } else {
        return left.value.localeCompare(right.value)
      }
    })
  },
  unshiftUserKey (state, userKey) {
    state.userKeys.unshift(userKey)
  },
  modifyUserKey (state, userKey) {
    let index = state.userKeys.findIndex(
      (item) => item.identifier === userKey.identifier)
    state.userKeys.splice(index, 1, userKey)
  },
  deleteUserKey (state, identifier) {
    let index = state.userKeys.findIndex(
      (item) => item.identifier === identifier)
    state.userKeys.splice(index, 1)
  }
}
