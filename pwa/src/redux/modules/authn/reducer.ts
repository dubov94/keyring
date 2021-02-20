import { createReducer } from '@reduxjs/toolkit'
import {
  ServiceRegisterResponseError,
  ServiceGetSaltResponseError,
  ServiceLogInResponseError
} from '@/api/definitions'
import { reducer, RemoteData, zero, identity, withNoResult } from '@/redux/remote_data'
import {
  AuthnViaApiFlowIndicator,
  authnViaApiReset,
  authnViaApiSignal,
  AuthnViaDepotFlowError,
  AuthnViaDepotFlowIndicator,
  authnViaDepotReset,
  authnViaDepotSignal,
  RegistrationFlowIndicator,
  registrationReset,
  registrationSignal
} from './actions'
import { StandardError } from '@/redux/flow_signal'
import { isActionOf } from 'typesafe-actions'

export default createReducer<{
  registration: RemoteData<RegistrationFlowIndicator, {}, StandardError<ServiceRegisterResponseError>>;
  authnViaApi: RemoteData<AuthnViaApiFlowIndicator, {}, StandardError<ServiceGetSaltResponseError | ServiceLogInResponseError>>;
  authnViaDepot: RemoteData<AuthnViaDepotFlowIndicator, {}, StandardError<AuthnViaDepotFlowError>>;
}>(
  {
    registration: zero(),
    authnViaApi: zero(),
    authnViaDepot: zero()
  },
  (builder) => builder
    .addMatcher(isActionOf(registrationSignal), (state, action) => {
      state.registration = reducer(
        identity<RegistrationFlowIndicator>(),
        () => ({}),
        identity<StandardError<ServiceRegisterResponseError>>()
      )(state.registration, action.payload)
    })
    .addMatcher(isActionOf(registrationReset), (state) => {
      state.registration = withNoResult(state.registration)
    })
    .addMatcher(isActionOf(authnViaApiSignal), (state, action) => {
      state.authnViaApi = reducer(
        identity<AuthnViaApiFlowIndicator>(),
        () => ({}),
        identity<StandardError<ServiceGetSaltResponseError | ServiceLogInResponseError>>()
      )(state.authnViaApi, action.payload)
    })
    .addMatcher(isActionOf(authnViaApiReset), (state) => {
      state.authnViaApi = withNoResult(state.authnViaApi)
    })
    .addMatcher(isActionOf(authnViaDepotSignal), (state, action) => {
      state.authnViaDepot = reducer(
        identity<AuthnViaDepotFlowIndicator>(),
        () => ({}),
        identity<StandardError<AuthnViaDepotFlowError>>()
      )(state.authnViaDepot, action.payload)
    })
    .addMatcher(isActionOf(authnViaDepotReset), (state) => {
      state.authnViaDepot = withNoResult(state.authnViaDepot)
    })
)
