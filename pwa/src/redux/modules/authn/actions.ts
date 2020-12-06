import { withPayloadType } from '@/redux/actions';
import { AuthenticationViaApiProgress, AuthenticationViaDepotProgress, RegistrationProgress } from '@/store/state';
import { createAction } from '@reduxjs/toolkit';

export const setRegistrationProgress = createAction('authn/setRegistrationProgress', withPayloadType<RegistrationProgress>())
export const setAuthenticationViaApiProgress = createAction('authn/setAuthenticationViaApiProgress', withPayloadType<AuthenticationViaApiProgress>())
export const setAuthenticationViaDepotProgress = createAction('authn/setAuthenticationViaDepotProgress', withPayloadType<AuthenticationViaDepotProgress>())
