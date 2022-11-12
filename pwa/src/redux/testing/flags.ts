import { Flags, Mode } from '@/flags'

export const FAKE_FLAGS: Flags = {
  version: '0.0.0',
  mode: <Mode>process.env.NODE_ENV,
  turnstileSiteKey: 'keyring'
}
