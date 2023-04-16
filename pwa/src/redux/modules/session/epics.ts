import { function as fn, option } from 'fp-ts'
import { Epic } from 'redux-observable'
import { EMPTY, Observable, of } from 'rxjs'
import { switchMap, filter, take } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import { injectionsSetUp } from '@/redux/actions'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { LogoutTrigger } from '@/redux/modules/user/account/actions'
import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import { rehydrateSession } from './actions'

export const displayLogoutTriggerEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(rehydrateSession)),
  switchMap((action) => action$.pipe(
    filter(isActionOf(injectionsSetUp)),
    take(1),
    switchMap(() => fn.pipe(
      option.fromNullable(action.payload.logoutTrigger),
      option.filter((trigger) => trigger !== LogoutTrigger.USER_REQUEST),
      option.map<LogoutTrigger, Observable<RootAction>>((trigger) => of(showToast({
        message: `We had to reload the app (${trigger}) — sorry about that.`
      }))),
      option.getOrElse<Observable<RootAction>>(() => EMPTY)
    ))
  ))
)
