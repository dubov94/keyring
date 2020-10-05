import { Store } from 'vuex'
import { RootState } from './state'
import { container } from 'tsyringe'

export const STORE_TOKEN = 'Store'

export const getStore = () => container.resolve<Store<RootState>>(STORE_TOKEN)
