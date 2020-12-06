import {
  ServiceRegisterResponseError,
  ServiceLogInResponseError,
  ServiceGetSaltResponseError,
  ServiceChangeMasterKeyResponseError,
  ServiceChangeUsernameResponseError,
  ServiceDeleteAccountResponseError,
  ServiceAcquireMailTokenResponseError,
  ServiceReleaseMailTokenResponseError
} from '@/api/definitions'
import { FlowProgress, FlowProgressBasicState, indicator } from './flow'

export interface Password {
  value: string;
  tags: Array<string>;
}

export interface Key extends Password {
  identifier: string;
}

export interface Geolocation {
  country?: string;
  city?: string;
}

export interface Session {
  creationTimeInMillis: number;
  ipAddress: string;
  userAgent: string;
  geolocation: Geolocation;
}

export enum RegistrationProgressState {
  GENERATING_PARAMETRIZATION = 'GENERATING_PARAMETRIZATION',
  COMPUTING_MASTER_KEY_DERIVATIVES = 'COMPUTING_MASTER_KEY_DERIVATIVES',
  MAKING_REQUEST = 'MAKING_REQUEST',
}
export type RegistrationProgress = FlowProgress<RegistrationProgressState, void, ServiceRegisterResponseError>

export enum AuthenticationViaApiProgressState {
  RETRIEVING_PARAMETRIZATION = 'API_AUTH_RETRIEVING_PARAMETRIZATION',
  COMPUTING_MASTER_KEY_DERIVATIVES = 'API_AUTH_COMPUTING_MASTER_KEY_DERIVATIVES',
  MAKING_REQUEST = 'API_AUTH_MAKING_REQUEST',
  DECRYPTING_DATA = 'API_AUTH_DECRYPTING_DATA'
}
export type AuthenticationViaApiProgress = FlowProgress<
  AuthenticationViaApiProgressState,
  void,
  ServiceGetSaltResponseError | ServiceLogInResponseError
>

export enum AuthenticationViaDepotProgressState {
  COMPUTING_MASTER_KEY_DERIVATIVES = 'DEPOT_AUTH_COMPUTING_MASTER_KEY_DERIVATIVES',
  DECRYPTING_DATA = 'DEPOT_AUTH_DECRYPTING_DATA',
}
export enum AuthenticationViaDepotProgressError {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
}
export type AuthenticationViaDepotProgress = FlowProgress<
  AuthenticationViaDepotProgressState,
  void,
  AuthenticationViaDepotProgressError
>

export interface RootState {
  authenticationViaApi: AuthenticationViaApiProgress;
  authenticationViaDepot: AuthenticationViaDepotProgress;
}

export const constructInitialRootState = (): RootState => ({
  authenticationViaApi: indicator(FlowProgressBasicState.IDLE, undefined),
  authenticationViaDepot: indicator(FlowProgressBasicState.IDLE, undefined)
})

export enum UserKeysProgressState {
  WORKING = 'WORKING',
}
export type UserKeysProgress = FlowProgress<UserKeysProgressState, Array<Key>, void>

export interface UserState {
  isAuthenticated: boolean;
  parametrization: string | null;
  encryptionKey: string | null;
  sessionKey: string | null;
  userKeysProgress: UserKeysProgress;
  requiresMailVerification: boolean;
}

export const constructInitialUserState = (): UserState => ({
  isAuthenticated: false,
  parametrization: null,
  encryptionKey: null,
  sessionKey: null,
  userKeysProgress: indicator(FlowProgressBasicState.IDLE, []),
  requiresMailVerification: false
})

export interface SessionState {
  username: string | null;
}

export const constructInitialSessionState = (): SessionState => ({
  username: null
})

export interface DepotEssence {
  username: string | null;
  parametrization: string | null;
  authDigest: string | null;
  userKeys: string | null;
}

export type DepotState = DepotEssence & { encryptionKey: string | null }

export const getDepotEssense = (depot: DepotState): DepotEssence => ({
  username: depot.username,
  parametrization: depot.parametrization,
  authDigest: depot.authDigest,
  userKeys: depot.userKeys
})

export const constructInitialDepotState = (): DepotState => ({
  username: null,
  parametrization: null,
  authDigest: null,
  encryptionKey: null,
  userKeys: null
})

export interface ToastState {
  message: string | null;
  timeout: number;
  show: boolean;
}

export const constructInitialToastState = () => ({
  message: null,
  timeout: NaN,
  show: false
})

export interface EditorState {
  // Whether the key is visible.
  reveal: boolean;
  // Key identifier. `null` stands for new.
  identifier: string | null | undefined;
  show: boolean;
}

export const constructInitialEditorState = () => ({
  reveal: false,
  identifier: undefined,
  show: false
})

export enum RecentSessionsProgressState { WORKING = 'WORKING' }
export type RecentSessionsProgress = FlowProgress<RecentSessionsProgressState, Array<Session>, void>

export enum DuplicateGroupsProgressState { WORKING = 'WORKING' }
export type DuplicateGroupsProgress = FlowProgress<DuplicateGroupsProgressState, Array<Array<string>>, void>

export enum ExposedUserKeyIdsProgressState { WORKING = 'WORKING' }
export type ExposedUserKeyIdsProgress = FlowProgress<ExposedUserKeyIdsProgressState, Array<string>, void>

export interface SecurityState {
  recentSessions: RecentSessionsProgress;
  duplicateGroups: DuplicateGroupsProgress;
  exposedUserKeyIds: ExposedUserKeyIdsProgress;
}

export const constructInitialSecurityState = (): SecurityState => ({
  recentSessions: indicator(FlowProgressBasicState.IDLE, []),
  duplicateGroups: indicator(FlowProgressBasicState.IDLE, []),
  exposedUserKeyIds: indicator(FlowProgressBasicState.IDLE, [])
})

export enum ChangeMasterKeyProgressState {
  REENCRYPTING = 'REENCRYPTING',
  MAKING_REQUEST = 'MAKING_REQUEST',
}
export type ChangeMasterKeyProgress = FlowProgress<ChangeMasterKeyProgressState, void, ServiceChangeMasterKeyResponseError>

export enum ChangeUsernameProgressState {
  COMPUTING_MASTER_KEY_DERIVATIVES = 'COMPUTING_MASTER_KEY_DERIVATIVES',
  MAKING_REQUEST = 'MAKING_REQUEST',
}
export type ChangeUsernameProgress = FlowProgress<ChangeUsernameProgressState, void, ServiceChangeUsernameResponseError>

export enum DeleteAccountProgressState {
  COMPUTING_MASTER_KEY_DERIVATIVES = 'COMPUTING_MASTER_KEY_DERIVATIVES',
  MAKING_REQUEST = 'MAKING_REQUEST',
}
export type DeleteAccountProgress = FlowProgress<DeleteAccountProgressState, void, ServiceDeleteAccountResponseError>

export enum AcquireMailTokenProgressState {
  COMPUTING_MASTER_KEY_DERIVATIVES = 'COMPUTING_MASTER_KEY_DERIVATIVES',
  MAKING_REQUEST = 'MAKING_REQUEST',
}
export type AcquireMailTokenProgress = FlowProgress<AcquireMailTokenProgressState, string, ServiceAcquireMailTokenResponseError>

export enum ReleaseMailTokenProgressState {
  MAKING_REQUEST = 'MAKING_REQUEST',
}
export type ReleaseMailTokenProgress = FlowProgress<ReleaseMailTokenProgressState, void, ServiceReleaseMailTokenResponseError>

export interface SettingsState {
  changeMasterKeyProgress: ChangeMasterKeyProgress;
  changeUsernameProgress: ChangeUsernameProgress;
  deleteAccountProgress: DeleteAccountProgress;
  mailToken: {
    acquireProgress: AcquireMailTokenProgress;
    releaseProgress: ReleaseMailTokenProgress;
  };
}

export const constructInitialSettingsState = (): SettingsState => ({
  changeMasterKeyProgress: indicator(FlowProgressBasicState.IDLE, undefined),
  changeUsernameProgress: indicator(FlowProgressBasicState.IDLE, undefined),
  deleteAccountProgress: indicator(FlowProgressBasicState.IDLE, undefined),
  mailToken: {
    acquireProgress: indicator(FlowProgressBasicState.IDLE, ''),
    releaseProgress: indicator(FlowProgressBasicState.IDLE, undefined)
  }
})

export type FullState = RootState & {
  depot: DepotState;
  user: UserState & {
    security: SecurityState;
    settings: SettingsState;
  };
  interface: {
    toast: ToastState;
    editor: EditorState;
  };
}

export const constructInitialFullState = (): FullState => ({
  ...constructInitialRootState(),
  depot: constructInitialDepotState(),
  user: {
    ...constructInitialUserState(),
    security: constructInitialSecurityState(),
    settings: constructInitialSettingsState()
  },
  interface: {
    toast: constructInitialToastState(),
    editor: constructInitialEditorState()
  }
})
