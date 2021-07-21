import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import { Epic } from 'redux-observable'
import { switchMap, filter, take } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import { rehydrateSession } from './actions'
import { function as fn, option } from 'fp-ts'
import { EMPTY, Observable, of } from 'rxjs'
import { showToast } from '../ui/toast/actions'
import { LogoutTrigger } from '../user/account/actions'
import { injectionsSetUp } from '@/redux/actions'

export const displayLogoutTriggerEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(rehydrateSession)),
  switchMap((action) => action$.pipe(
    filter(isActionOf(injectionsSetUp)),
    take(1),
    switchMap(() => fn.pipe(
      option.fromNullable(action.payload.logoutTrigger),
      option.filter((trigger) => trigger !== LogoutTrigger.USER_REQUEST),
      option.map<LogoutTrigger, Observable<RootAction>>(() => of(showToast({
        message: 'We had to reload the app — sorry about that.'
      }))),
      option.getOrElse<Observable<RootAction>>(() => EMPTY)
    ))
  ))
)
