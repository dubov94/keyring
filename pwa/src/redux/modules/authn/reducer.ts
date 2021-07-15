import { createReducer } from '@reduxjs/toolkit'
import {
  ServiceRegisterResponseError,
  ServiceGetSaltResponseError,
  ServiceLogInResponseError,
  ServiceProvideOtpResponseError
} from '@/api/definitions'
import { reducer, RemoteData, zero, identity, withNoResult } from '@/redux/remote_data'
import {
  AuthnOtpProvisionFlowError,
  AuthnOtpProvisionFlowIndicator,
  authnOtpProvisionReset,
  authnOtpProvisionSignal,
  AuthnViaApiFlowIndicator,
  AuthnViaApiFlowResult,
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
import { DeepReadonly } from 'ts-essentials'
import { castDraft } from 'immer'

export default createReducer<{
  registration: RemoteData<RegistrationFlowIndicator, {}, StandardError<ServiceRegisterResponseError>>;
  authnViaApi: RemoteData<AuthnViaApiFlowIndicator, AuthnViaApiFlowResult, StandardError<ServiceGetSaltResponseError | ServiceLogInResponseError>>;
  authnOtpProvision: RemoteData<AuthnOtpProvisionFlowIndicator, {}, StandardError<AuthnOtpProvisionFlowError>>;
  authnViaDepot: RemoteData<AuthnViaDepotFlowIndicator, {}, StandardError<AuthnViaDepotFlowError>>;
}>(
  {
    registration: zero(),
    authnViaApi: zero(),
    authnOtpProvision: zero(),
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
      state.authnViaApi = castDraft(reducer(
        identity<AuthnViaApiFlowIndicator>(),
        identity<DeepReadonly<AuthnViaApiFlowResult>>(),
        identity<StandardError<ServiceGetSaltResponseError | ServiceLogInResponseError>>()
      )(state.authnViaApi, action.payload))
    })
    .addMatcher(isActionOf(authnViaApiReset), (state) => {
      state.authnViaApi = withNoResult(state.authnViaApi)
    })
    .addMatcher(isActionOf(authnOtpProvisionSignal), (state, action) => {
      state.authnOtpProvision = reducer(
        identity<AuthnOtpProvisionFlowIndicator>(),
        () => ({}),
        identity<StandardError<AuthnOtpProvisionFlowError>>()
      )(state.authnOtpProvision, action.payload)
    })
    .addMatcher(isActionOf(authnOtpProvisionReset), (state) => {
      state.authnOtpProvision = withNoResult(state.authnOtpProvision)
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
