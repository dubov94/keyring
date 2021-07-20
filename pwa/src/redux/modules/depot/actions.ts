import { createAction } from 'typesafe-actions'
import { DeepReadonly } from 'ts-essentials'

export const rehydrateDepot = createAction('depot/rehydrate')<DeepReadonly<{
  username: string | null;
  salt: string | null;
  hash: string | null;
  vault: string | null;
  encryptedOtpToken: string | null;
}>>()

export const newVault = createAction('depot/newVault')<string>()

export const activateDepot = createAction('depot/activate')<DeepReadonly<{
  username: string;
  password: string;
}>>()
export const depotActivationData = createAction('depot/activationData')<DeepReadonly<{
  username: string;
  salt: string;
  hash: string;
  depotKey: string;
}>>()
export const clearDepot = createAction('depot/clear')()
