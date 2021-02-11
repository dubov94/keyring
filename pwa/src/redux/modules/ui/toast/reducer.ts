import { createReducer } from '@reduxjs/toolkit'
import { isActionOf } from 'typesafe-actions'
import { hideToast, toastReadyToBeShown } from './actions'

export default createReducer<{
  show: boolean;
  message: string | null;
  timeout: number;
}>(
  {
    show: false,
    message: null,
    timeout: NaN
  },
  (builder) => builder
    .addMatcher(isActionOf(hideToast), (state) => {
      state.show = false
      state.message = null
      state.timeout = NaN
    })
    .addMatcher(isActionOf(toastReadyToBeShown), (state, action) => {
      state.message = action.payload.message
      state.timeout = action.payload.timeout
      state.show = true
    })
)
