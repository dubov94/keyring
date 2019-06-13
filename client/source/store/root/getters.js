import Status from './status'

export default {
  hasSessionKey: (state) => state.sessionKey !== null,
  isOnline: (state) => state.status === Status.ONLINE,
  isUserActive: (state) => state.isUserActive
}
