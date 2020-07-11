import { Status } from './status'
import { GetterTree } from 'vuex'
import { RootState } from './state'

export enum Type {
  IS_ONLINE = 'isOnline',
  IS_USER_ACTIVE = 'isUserActive',
  HAS_SESSION_KEY = 'hasSessionKey',
  HAS_SESSIONS_DATA = 'hasSessionsData',
}

export const getters: GetterTree<RootState, RootState> = {
  [Type.IS_ONLINE]: (state) => state.status === Status.ONLINE,
  [Type.IS_USER_ACTIVE]: (state) => state.isUserActive,
  [Type.HAS_SESSION_KEY]: (state) => state.sessionKey !== null,
  [Type.HAS_SESSIONS_DATA]: (state) => state.recentSessions !== null
}
