import { AuthenticationViaApiProgress, AuthenticationViaDepotProgress, RegistrationProgress } from '@/store/state'
import { createAction } from 'typesafe-actions'

export const setRegistrationProgress = createAction('authn/setRegistrationProgress')<RegistrationProgress>()
export const setAuthenticationViaApiProgress = createAction('authn/setAuthenticationViaApiProgress')<AuthenticationViaApiProgress>()
export const setAuthenticationViaDepotProgress = createAction('authn/setAuthenticationViaDepotProgress')<AuthenticationViaDepotProgress>()

export const register = {
  act: createAction('authn/register/act')<{
    username: string;
    password: string;
    mail: string;
  }>(),
  reset: createAction('authn/register/reset')()
}

