import { Status } from './status'

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

export const constructRootState = (): RootState => ({
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

export interface DepotState {
  username: string | null;
  parametrization: string | null;
  authDigest: string | null;
  encryptionKey: string | null;
  userKeys: string | null;
}

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

export interface ThreatsState {
  isAnalysisEnabled: boolean;
  gettingDuplicateGroups: boolean;
  duplicateGroups: Array<Array<string>>;
  gettingExposedUserKeys: boolean;
  exposedUserKeyIds: Array<string>;
}

export interface FullState extends RootState {
  depot: DepotState;
  interface: InterfaceState;
  session: SessionState;
  threats: ThreatsState;
}
