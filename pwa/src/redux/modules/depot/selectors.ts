import { RootState } from '@/redux/root_reducer'

export const isDepotActive = (state: RootState): boolean => state.depot.persisted
export const depotUsername = (state: RootState): string | null => state.depot.credentials?.username

type Snapshot = {
  username: string | null;
  salt: string | null;
  hash: string | null;
  vault: string | null;
  encryptedOtpToken: string | null;
}

const emptyState = (): Snapshot => ({
  username: null,
  salt: null,
  hash: null,
  vault: null,
  encryptedOtpToken: null
})

export const snapshot = (state: RootState): Snapshot => {
  if (!state.depot.persisted) {
    return emptyState()
  }
  const { credentials } = state.depot
  if (credentials === null) {
    return emptyState()
  }
  return {
    username: credentials.username,
    salt: credentials.salt,
    hash: credentials.hash,
    vault: state.depot.vault,
    encryptedOtpToken: state.depot.encryptedOtpToken
  }
}
