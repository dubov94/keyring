import { Status } from './status'

export default {
  isOnline: (state) => state.status === Status.ONLINE,
  isUserActive: (state) => state.isUserActive,
  hasSessionKey: (state) => state.sessionKey !== null,
  hasSessionsData: (state) => state.recentSessions !== null
}
