import { constructInitialSessionState, ReduxFullState } from '@/store/state'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export const getSessionUsername = (state: ReduxFullState) => state.session.username

export const sessionSlice = createSlice({
  name: 'session',
  initialState: constructInitialSessionState(),
  reducers: {
    setUsername: (state, action: PayloadAction<string | null>) => {
      state.username = action.payload
    },
    rehydrate: (state, action: PayloadAction<{ username: string | null }>) => {
      state.username = action.payload.username
    }
  }
})
