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

export interface Session {
  creationTimeInMillis: number;
  ipAddress: string;
  userAgent: string;
  geolocation: Geolocation;
}
