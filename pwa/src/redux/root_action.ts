import { ActionType } from 'typesafe-actions'
import { injectionsSetUp  } from './actions'
import * as authnActions from './modules/authn/actions'
import * as depotActions from './modules/depot/actions'
import * as sessionActions from './modules/session/actions'
import * as userAccountActions from './modules/user/account/actions'
import * as userKeysActions from './modules/user/keys/actions'
import * as userSecurityActions from './modules/user/security/actions'
import * as uiToastActions from './modules/ui/toast/actions'

const actions = {
  injectionsSetUp,
  authn: authnActions,
  depot: depotActions,
  session: sessionActions,
  ui: {
    uiToastActions
  },
  user: {
    userAccountActions,
    userKeysActions,
    userSecurityActions
  }
}

export type RootAction = ActionType<typeof actions>
