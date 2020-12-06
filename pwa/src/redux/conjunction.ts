import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { ActionType, StateType } from 'typesafe-actions';

import * as sessionActions from './modules/session/actions'
import sessionReducer from './modules/session/reducer'
import * as authnActions from './modules/authn/actions'
import authnReducer from './modules/authn/reducer'

const actions = {
  authn: authnActions,
  session: sessionActions
}

export type RootAction = ActionType<typeof actions>

const reducer = combineReducers({
  authn: authnReducer,
  session: sessionReducer
})

export type RootState = StateType<typeof reducer>

export const store = configureStore({ reducer })
