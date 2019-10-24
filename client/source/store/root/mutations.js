export default {
  setStatus (state, status) {
    state.status = status
  },
  setParametrization (state, parametrization) {
    state.parametrization = parametrization
  },
  setSessionKey (state, sessionKey) {
    state.sessionKey = sessionKey
  },
  setEncryptionKey (state, value) {
    state.encryptionKey = value
  },
  setDepotEncryptionKey (state, value) {
    state.depotEncryptionKey = value
  },
  setIsUserActive (state, value) {
    state.isUserActive = value
  },
  setUserKeys (state, userKeys) {
    userKeys.sort((left, right) => {
      let [leftTagIndex, rightTagIndex] = [0, 0]
      let [leftTagCount, rightTagCount] = [left.tags.length, right.tags.length]
      while (leftTagIndex < leftTagCount && rightTagIndex < rightTagCount) {
        let tagsComparison = String.prototype.localeCompare.call(
          left.tags[leftTagIndex], right.tags[rightTagIndex])
        if (tagsComparison !== 0) {
          return tagsComparison
        }
        leftTagIndex += 1
        rightTagIndex += 1
      }
      if (leftTagIndex === leftTagCount && rightTagIndex === rightTagCount) {
        return String.prototype.localeCompare.call(left.value, right.value)
      } else {
        return leftTagCount - leftTagIndex + rightTagIndex - rightTagCount
      }
    })
    state.userKeys = userKeys
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
  },
  setRecentSessions (state, list) {
    state.recentSessions = list
  }
}
