import { ActionTree } from 'vuex'
import { RootState } from '../../state'
import { AccountActions as Account } from './account'
import { AuthenticationActions as Authentication } from './authentication'
import { KeysActions as Keys } from './keys'
import { MailActions as Mail } from './mail'
import { sessionKey$, isUserActive$ } from '../getters'
import { switchMap, retryWhen, delay, withLatestFrom, filter } from 'rxjs/operators'
import { empty, timer, defer, fromEvent } from 'rxjs'
import { SESSION_LIFETIME_IN_MILLIS } from '@/constants'
import { getAdministrationApi } from '@/api/injections'
import { createSessionHeader } from './utilities'
import { reloadPage } from '@/utilities'

sessionKey$.pipe(
  switchMap(
    (sessionKey) => sessionKey === null ? empty() : timer(
      SESSION_LIFETIME_IN_MILLIS / 2, SESSION_LIFETIME_IN_MILLIS / 2
    ).pipe(
      switchMap(
        () => defer(() => getAdministrationApi().keepAlive({}, {
          headers: createSessionHeader(sessionKey)
        })).pipe(retryWhen(errors => errors.pipe(delay(1000))))
      )
    )
  )
).subscribe()

fromEvent(document, 'visibilitychange').pipe(
  switchMap(
    () => document.visibilityState === 'visible' ? empty() : timer(
      SESSION_LIFETIME_IN_MILLIS).pipe(
      withLatestFrom(isUserActive$),
      filter(([, isUserActive]) => isUserActive)
    )
  )
).subscribe(() => {
  reloadPage()
})

export const RootActions: ActionTree<RootState, RootState> = Object.assign({}, Account, Authentication, Keys, Mail)
