import { configureStore } from '@reduxjs/toolkit'
import { combineEpics, createEpicMiddleware } from 'redux-observable'
import { container } from 'tsyringe'
import { reducer, RootAction, RootState } from './conjunction'
import { REDUX_TOKEN } from './store_di'
import { registerEpic } from './modules/authn/epics'

const epicMiddleware = createEpicMiddleware<RootAction, RootAction, RootState>()

export const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) => [...getDefaultMiddleware(), epicMiddleware]
})

epicMiddleware.run(combineEpics(
  registerEpic
))

container.register(REDUX_TOKEN, {
  useValue: store
})
