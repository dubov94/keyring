export interface Password {
  value: string;
  tags: string[];
}

export interface KeyAttrs {
  isShadow: boolean;
  parent: string;
}

export interface WithKeyId {
  identifier: string;
}

export interface WithKeyAttrs {
  attrs: KeyAttrs;
}

export type Key = WithKeyId & WithKeyAttrs & Password & {
  creationTimeInMillis: number;
}

export interface EditableUnit {
  parent?: Key;
  shadow?: Key;
}

export interface Geolocation {
  country?: string;
  city?: string;
}

export enum SessionStatus {
  UNKNOWN_STATUS = 'UNKNOWN_STATUS',
  AWAITING_2FA = 'AWAITING_2FA',
  ACTIVATED = 'ACTIVATED'
}

export interface Session {
  creationTimeInMillis: number;
  ipAddress: string;
  userAgent: string;
  geolocation: Geolocation;
  status: SessionStatus;
}
