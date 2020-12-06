import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { ActionType, StateType } from 'typesafe-actions';

import * as sessionActions from './modules/session/actions'
import sessionReducer from './modules/session/reducer'

const actions = {
  session: sessionActions
}

export type RootAction = ActionType<typeof actions>

const reducer = combineReducers({
  session: sessionReducer
})

export type RootState = StateType<typeof reducer>

export const store = configureStore({ reducer })
