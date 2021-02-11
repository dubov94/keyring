import { combineReducers } from '@reduxjs/toolkit'
import authnReducer from './modules/authn/reducer'
import depotReducer from './modules/depot/reducer'
import sessionReducer from './modules/session/reducer'
import userAccountReducer from './modules/user/account/reducer'
import userKeysReducer from './modules/user/keys/reducer'
import userSecurityReducer from './modules/user/security/reducer'
import uiToastReducer from './modules/ui/toast/reducer'
import { StateType } from 'typesafe-actions'

export const reducer = combineReducers({
  authn: authnReducer,
  depot: depotReducer,
  session: sessionReducer,
  ui: combineReducers({
    toast: uiToastReducer
  }),
  user: combineReducers({
    account: userAccountReducer,
    keys: userKeysReducer,
    security: userSecurityReducer
  })
})

export type RootState = StateType<typeof reducer>
