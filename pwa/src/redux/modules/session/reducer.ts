import { createReducer } from '@reduxjs/toolkit'
import { isActionOf } from 'typesafe-actions'
import { rehydrate, setUsername } from './actions'

export default createReducer<{ username: string | null }>(
  { username: null },
  (builder) => builder
    .addMatcher(isActionOf(setUsername), (state, action) => {
      state.username = action.payload
    })
    .addMatcher(isActionOf(rehydrate), (state, action) => {
      state.username = action.payload.username
    })
)
