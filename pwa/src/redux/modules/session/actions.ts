import { DeepReadonly } from 'ts-essentials'
import { createAction } from 'typesafe-actions'
import { LogoutTrigger } from '@/redux/modules/user/account/actions'

export const rehydration = createAction('session/rehydration')<DeepReadonly<{
  username: string | null;
  logoutTrigger: LogoutTrigger | null;
}>>()
