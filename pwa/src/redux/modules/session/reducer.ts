import { createReducer } from '@reduxjs/toolkit'
import { isActionOf } from 'typesafe-actions'
import { isActionSuccess } from '@/redux/flow_signal'
import { remoteAuthnComplete, authnViaDepotSignal, registrationSignal } from '@/redux/modules/authn/actions'
import { logOut, LogoutTrigger, usernameChangeSignal } from '@/redux/modules/user/account/actions'
import { rehydration } from './actions'

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
    .addMatcher(isActionOf(rehydration), (state, action) => {
      state.username = action.payload.username
    })
    .addMatcher(isActionOf(logOut), (state, action) => {
      state.username = null
      state.logoutTrigger = action.payload
    })
)
