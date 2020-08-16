import { ActionTree } from 'vuex'
import { RootState } from '../../state'
import { AccountActions as Account } from './account'
import { AuthenticationActions as Authentication } from './authentication'
import { KeysActions as Keys } from './keys'
import { MailActions as Mail } from './mail'

export const RootActions: ActionTree<RootState, RootState> = Object.assign({}, Account, Authentication, Keys, Mail)
