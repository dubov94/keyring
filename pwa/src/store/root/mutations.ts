import { MutationTree } from 'vuex'
import { RootState, Key, Session, RegistrationData } from '../state'
import { Status } from './status'
import { createCommitSubject } from '../subject'

export enum Type {
  SET_STATUS = 'setStatus',
  SET_PARAMETRIZATION = 'setParametrization',
  SET_SESSION_KEY = 'setSessionKey',
  SET_ENCRYPTION_KEY = 'setEncryptionKey',
  SET_IS_USER_ACTIVE = 'setIsUserActive',
  SET_USER_KEYS = 'setUserKeys',
  UNSHIFT_USER_KEY = 'unshiftUserKey',
  MODIFY_USER_KEY = 'modifyUserKey',
  DELETE_USER_KEY = 'deleteUserKey',
  SET_RECENT_SESSIONS = 'setRecentSessions',
  SET_REQUIRES_MAIL_VERIFICATION = 'setRequiresMailVerification',
  SET_REGISTRATION_DATA = 'setRegistrationData',
}

export const setRegistrationData$ = createCommitSubject<RegistrationData>(Type.SET_REGISTRATION_DATA)
export const setSessionKey$ = createCommitSubject<string | null>(Type.SET_SESSION_KEY)
export const setParametrization$ = createCommitSubject<string>(Type.SET_PARAMETRIZATION)
export const setEncryptionKey$ = createCommitSubject<string>(Type.SET_ENCRYPTION_KEY);
export const setRequiresMailVerification$ = createCommitSubject<boolean>(Type.SET_REQUIRES_MAIL_VERIFICATION);
export const setStatus$ = createCommitSubject<Status>(Type.SET_STATUS)
export const setIsUserActive$ = createCommitSubject<boolean>(Type.SET_IS_USER_ACTIVE)

export const mutations: MutationTree<RootState> = {
  [Type.SET_STATUS] (state, status: Status) {
    state.status = status
  },
  [Type.SET_PARAMETRIZATION] (state, parametrization: string) {
    state.parametrization = parametrization
  },
  [Type.SET_SESSION_KEY] (state, sessionKey: string) {
    state.sessionKey = sessionKey
  },
  [Type.SET_ENCRYPTION_KEY] (state, value: string) {
    state.encryptionKey = value
  },
  [Type.SET_IS_USER_ACTIVE] (state, value: boolean) {
    state.isUserActive = value
  },
  [Type.SET_USER_KEYS] (state, userKeys: Array<Key>) {
    userKeys.sort((left, right) => {
      const [leftTagCount, rightTagCount] = [left.tags.length, right.tags.length]
      for (let tagIndex = 0; tagIndex < leftTagCount && tagIndex < rightTagCount; ++tagIndex) {
        const tagsComparison = String.prototype.localeCompare.call(
          left.tags[tagIndex], right.tags[tagIndex])
        if (tagsComparison !== 0) {
          return tagsComparison
        }
      }
      if (leftTagCount === rightTagCount) {
        return String.prototype.localeCompare.call(left.value, right.value)
      } else {
        return leftTagCount - rightTagCount
      }
    })
    state.userKeys = userKeys
  },
  [Type.UNSHIFT_USER_KEY] (state, userKey: Key) {
    state.userKeys.unshift(userKey)
  },
  [Type.MODIFY_USER_KEY] (state, userKey: Key) {
    const index = state.userKeys.findIndex(
      (item) => item.identifier === userKey.identifier)
    if (index > -1) {
      state.userKeys.splice(index, 1, userKey)
    } else {
      console.error(`Key '${userKey.identifier}' does not exist`)
    }
  },
  [Type.DELETE_USER_KEY] (state, identifier: string) {
    const index = state.userKeys.findIndex(
      (item) => item.identifier === identifier)
    if (index > -1) {
      state.userKeys.splice(index, 1)
    } else {
      console.error(`Key '${identifier}' does not exist`)
    }
  },
  [Type.SET_RECENT_SESSIONS] (state, list: Array<Session>) {
    state.recentSessions = list
  },
  [Type.SET_REQUIRES_MAIL_VERIFICATION] (state, value: boolean) {
    state.requiresMailVerification = value
  },
  [Type.SET_REGISTRATION_DATA] (state, value: RegistrationData) {
    state.registrationData = value
  }
}
