import { DeepReadonly } from 'ts-essentials'
import { createAction } from 'typesafe-actions'

export const rehydrateSession = createAction('session/rehydrate')<DeepReadonly<
  { username: string | null }
>>()
