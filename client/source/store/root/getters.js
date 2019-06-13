import Status from './status'

export default {
  hasSessionKey: (state) => state.sessionKey !== null,
  isOnline: (state) => state.status === Status.ONLINE,
  isActive: (state) => state.isActive
}
