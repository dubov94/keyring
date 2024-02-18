import { createAction } from 'typesafe-actions'
import { DeepReadonly } from 'ts-essentials'

export const rehydration = createAction('depot/rehydration')<DeepReadonly<{
  username: string | null;
  salt: string | null;
  hash: string | null;
  vault: string | null;
  encryptedOtpToken: string | null;
}>>()

export const newVault = createAction('depot/newVault')<string>()
export const newEncryptedOtpToken = createAction('depot/newEncryptedOtpToken')<string | null>()

export const generateDepotKeys = createAction('depot/generateKeys')<DeepReadonly<{
  username: string;
  password: string;
}>>()
export interface DepotActivationData {
  username: string;
  salt: string;
  hash: string;
  depotKey: string;
}
export const depotActivationData = createAction('depot/activationData')<DeepReadonly<DepotActivationData>>()
export const clearDepot = createAction('depot/clear')()
