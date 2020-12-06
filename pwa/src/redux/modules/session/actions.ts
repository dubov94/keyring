import { createAction } from 'typesafe-actions'

export const setUsername = createAction('session/setUsername')<string | null>()
export const rehydrate = createAction('session/rehydrate')<{ username: string | null }>()
