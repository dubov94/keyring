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
}

export const INITIAL_STATE: RootState = {
  status: Status.OFFLINE,
  isUserActive: false,
  parametrization: null,
  encryptionKey: null,
  sessionKey: null,
  userKeys: [],
  recentSessions: null
}
