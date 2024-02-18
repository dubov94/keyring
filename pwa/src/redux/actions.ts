import { createAction } from 'typesafe-actions'

export const injected = createAction('app/injected')()
export const terminate = createAction('app/terminate')()
