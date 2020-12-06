import { configureStore } from '@reduxjs/toolkit'
import { container } from 'tsyringe'
import { reducer } from './conjunction'
import { REDUX_TOKEN } from './store_di'

export const store = configureStore({ reducer: reducer })

container.register(REDUX_TOKEN, {
  useValue: store
})
