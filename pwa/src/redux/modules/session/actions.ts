import { DeepReadonly } from 'ts-essentials'
import { createAction } from 'typesafe-actions'
import { LogoutTrigger } from '../user/account/actions'

export const rehydrateSession = createAction('session/rehydrate')<DeepReadonly<{
  username: string | null;
  logoutTrigger: LogoutTrigger | null;
}>>()
