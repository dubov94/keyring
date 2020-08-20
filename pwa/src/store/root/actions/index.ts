import { ActionTree } from 'vuex'
import { RootState } from '../../state'
import { AccountActions as Account } from './account'
import { AuthenticationActions as Authentication } from './authentication'
import { KeysActions as Keys } from './keys'
import { MailActions as Mail } from './mail'
import { setSessionKey$ } from '../mutations'
import { switchMap, retryWhen, delay } from 'rxjs/operators'
import { empty, timer, defer } from 'rxjs'
import { SESSION_LIFETIME_IN_MILLIS } from '@/constants'
import { container } from 'tsyringe'
import { AdministrationApi } from '@/api/definitions'
import { ADMINISTRATION_API_TOKEN } from '@/api/injections'
import { createSessionHeader } from './utilities'

setSessionKey$.pipe(
  switchMap(
    (sessionKey) => sessionKey === null ? empty() : timer(
      SESSION_LIFETIME_IN_MILLIS / 2, SESSION_LIFETIME_IN_MILLIS / 2
    ).pipe(
      switchMap(
        () => defer(() => container.resolve<AdministrationApi>(ADMINISTRATION_API_TOKEN).keepAlive({}, {
          headers: createSessionHeader(sessionKey)
        })).pipe(retryWhen(errors => errors.pipe(delay(1000))))
      )
    )
  )
).subscribe()

export const RootActions: ActionTree<RootState, RootState> = Object.assign({}, Account, Authentication, Keys, Mail)
