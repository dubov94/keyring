import { isActionSuccess, isActionSuccess2 } from '@/redux/flow_signal'
import { createReducer } from '@reduxjs/toolkit'
import { isActionOf } from 'typesafe-actions'
import { authnViaApiSignal, authnViaDepotSignal, registrationSignal } from '../authn/actions'
import { logOut, usernameChangeSignal } from '../user/account/actions'
import { rehydrateSession } from './actions'

export default createReducer<{ username: string | null }>(
  { username: null },
  (builder) => builder
    .addMatcher(isActionSuccess(registrationSignal), (state, action) => {
      state.username = action.payload.data.username
    })
    .addMatcher(isActionSuccess2([authnViaApiSignal, authnViaDepotSignal]), (state, action) => {
      state.username = action.payload.data.username
    })
    .addMatcher(isActionSuccess(usernameChangeSignal), (state, action) => {
      state.username = action.payload.data.update
    })
    .addMatcher(isActionOf(rehydrateSession), (state, action) => {
      state.username = action.payload.username
    })
    .addMatcher(isActionOf(logOut), (state) => {
      state.username = null
    })
)
