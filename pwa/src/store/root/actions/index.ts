import { ActionTree } from 'vuex'
import { RootState } from '../state'
import { AccountActions as Account } from './account'
import Authentication from './authentication'
import Keys from './keys'
import { MailActions as Mail } from './mail'

export const RootActions: ActionTree<RootState, RootState> = Object.assign({}, Account, Authentication, Keys, Mail)
