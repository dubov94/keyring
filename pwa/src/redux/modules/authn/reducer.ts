import { createReducer } from '@reduxjs/toolkit'
import { RegistrationProgress, AuthenticationViaApiProgress, AuthenticationViaDepotProgress } from '@/store/state'
import { FlowProgressBasicState, indicator } from '@/store/flow'
import { setAuthenticationViaApiProgress, setAuthenticationViaDepotProgress, setRegistrationProgress } from './actions'
import { isActionOf } from 'typesafe-actions'

export default createReducer<{
  registrationProgress: RegistrationProgress;
  authenticationViaApi: AuthenticationViaApiProgress;
  authenticationViaDepot: AuthenticationViaDepotProgress;
}>(
  {
    registrationProgress: indicator(FlowProgressBasicState.IDLE, undefined),
    authenticationViaApi: indicator(FlowProgressBasicState.IDLE, undefined),
    authenticationViaDepot: indicator(FlowProgressBasicState.IDLE, undefined)
  },
  (builder) => builder
    .addMatcher(isActionOf(setRegistrationProgress), (state, action) => {
      state.registrationProgress = action.payload
    })
    .addMatcher(isActionOf(setAuthenticationViaApiProgress), (state, action) => {
      state.authenticationViaApi = action.payload
    })
    .addMatcher(isActionOf(setAuthenticationViaDepotProgress), (state, action) => {
      state.authenticationViaDepot = action.payload
    })
)
