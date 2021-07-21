import { isActionSuccess } from '@/redux/flow_signal'
import { createReducer } from '@reduxjs/toolkit'
import { isActionOf } from 'typesafe-actions'
import { remoteAuthnComplete, authnViaDepotSignal, registrationSignal } from '../authn/actions'
import { logOut, LogoutTrigger, usernameChangeSignal } from '../user/account/actions'
import { rehydrateSession } from './actions'

export default createReducer<{
  username: string | null;
  logoutTrigger: LogoutTrigger | null;
}>(
  {
    username: null,
    logoutTrigger: null
  },
  (builder) => builder
    .addMatcher(isActionSuccess(registrationSignal), (state, action) => {
      state.username = action.payload.data.username
    })
    .addMatcher(isActionOf(remoteAuthnComplete), (state, action) => {
      state.username = action.payload.username
    })
    .addMatcher(isActionSuccess(authnViaDepotSignal), (state, action) => {
      state.username = action.payload.data.username
    })
    .addMatcher(isActionSuccess(usernameChangeSignal), (state, action) => {
      state.username = action.payload.data.update
    })
    .addMatcher(isActionOf(rehydrateSession), (state, action) => {
      state.username = action.payload.username
    })
    .addMatcher(isActionOf(logOut), (state, action) => {
      state.username = null
      state.logoutTrigger = action.payload
    })
)
