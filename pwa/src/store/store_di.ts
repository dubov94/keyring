import { Store } from 'vuex'
import { ReduxFullState, RootState } from './state'
import { container } from 'tsyringe'
import { EnhancedStore } from '@reduxjs/toolkit'

export const STORE_TOKEN = 'Store'

export const getStore = () => container.resolve<Store<RootState>>(STORE_TOKEN)

export const REDUX_STORE_TOKEN = 'ReduxStore'

export const reduxGetStore = () => container.resolve<EnhancedStore<ReduxFullState>>(REDUX_STORE_TOKEN)
