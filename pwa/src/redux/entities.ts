export interface Password {
  value: string;
  tags: string[];
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
