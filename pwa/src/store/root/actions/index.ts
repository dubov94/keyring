import { ActionTree } from 'vuex'
import { RootState } from '../state'
import Account from './account'
import Authentication from './authentication'
import Keys from './keys'
import Mail from './mail'

export const RootActions: ActionTree<RootState, RootState> = Object.assign({}, Account, Authentication, Keys, Mail)
