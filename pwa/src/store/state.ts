import { Status } from './root/status'

export interface Password {
  value: string;
  tags: Array<string>;
}

export interface Key extends Password {
  identifier: string;
}

export interface Geolocation {
  country: string | undefined;
  city: string | undefined;
}

export interface Session {
  creationTimeInMillis: number;
  ipAddress: string;
  userAgent: string;
  geolocation: Geolocation;
}

export interface RootState {
  status: Status;
  isUserActive: boolean;
  parametrization: string | null;
  encryptionKey: string | null;
  sessionKey: string | null;
  userKeys: Array<Key>;
  recentSessions: Array<Session> | null;
  requiresMailVerification: boolean;
}

export const constructInitialRootState = (): RootState => ({
  status: Status.OFFLINE,
  isUserActive: false,
  parametrization: null,
  encryptionKey: null,
  sessionKey: null,
  userKeys: [],
  recentSessions: null,
  requiresMailVerification: false
})

export interface SessionState {
  username: string | null;
}

export const constructInitialSessionState = (): SessionState => ({
  username: null
})

export interface DepotState {
  username: string | null;
  parametrization: string | null;
  authDigest: string | null;
  encryptionKey: string | null;
  userKeys: string | null;
}

export const constructInitialDepotState = (): DepotState => ({
  username: null,
  parametrization: null,
  authDigest: null,
  encryptionKey: null,
  userKeys: null
})

export interface InterfaceState {
  toast: {
    message: string | null;
    timeout: number;
    show: boolean;
  };
  editor: {
    // Whether the key is visible.
    reveal: boolean;
    // Key identifier. `null` stands for new.
    identifier: string | null | undefined;
    show: boolean;
  };
}

export const constructInitialToastState = () => ({
  message: null,
  timeout: NaN,
  show: false
})

export const constructInitialEditorState = () => ({
  reveal: false,
  identifier: undefined,
  show: false
})

export const constructInitialInterfaceState = (): InterfaceState => ({
  toast: constructInitialToastState(),
  editor: constructInitialEditorState()
})

export interface ThreatsState {
  isAnalysisEnabled: boolean;
  gettingDuplicateGroups: boolean;
  duplicateGroups: Array<Array<string>>;
  gettingExposedUserKeys: boolean;
  exposedUserKeyIds: Array<string>;
}

export const constructInitialThreatsState = (): ThreatsState => ({
  isAnalysisEnabled: false,
  gettingDuplicateGroups: false,
  duplicateGroups: [],
  gettingExposedUserKeys: false,
  exposedUserKeyIds: []
})

export interface FullState extends RootState {
  depot: DepotState;
  interface: InterfaceState;
  session: SessionState;
  threats: ThreatsState;
}

export const constructInitialFullState = (): FullState => Object.assign(
  {},
  constructInitialRootState(),
  {
    depot: constructInitialDepotState(),
    interface: constructInitialInterfaceState(),
    session: constructInitialSessionState(),
    threats: constructInitialThreatsState()
  }
)
