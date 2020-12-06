import { createReducer } from '@reduxjs/toolkit'
import { RegistrationProgress, AuthenticationViaApiProgress, AuthenticationViaDepotProgress } from '@/store/state'
import { FlowProgressBasicState, indicator } from '@/store/flow'
import { setAuthenticationViaApiProgress, setAuthenticationViaDepotProgress, setRegistrationProgress } from './actions'

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
    .addCase(setRegistrationProgress, (state, action) => {
      state.registrationProgress = action.payload
    })
    .addCase(setAuthenticationViaApiProgress, (state, action) => {
      state.authenticationViaApi = action.payload
    })
    .addCase(setAuthenticationViaDepotProgress, (state, action) => {
      state.authenticationViaDepot = action.payload
    })
)
