import { createReducer } from '@reduxjs/toolkit'
import { rehydrate, setUsername } from './actions'

export default createReducer<{ username: string | null }>(
  { username: null },
  (builder) => builder
    .addCase(setUsername, (state, action) => {
      state.username = action.payload
    })
    .addCase(rehydrate, (state, action) => {
      state.username = action.payload.username
    })
)
