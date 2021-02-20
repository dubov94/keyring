import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import { Epic } from 'redux-observable'
import { concat, from, of } from 'rxjs'
import { filter, switchMap, switchMapTo } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import { hideToast, showToast, toastReadyToBeShown } from './actions'
import { getVueConstructor } from '@/vue_di'

export const showToastEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(showToast)),
  switchMap((action) => concat(
    of(hideToast()),
    from(getVueConstructor().nextTick()).pipe(
      switchMapTo(of(toastReadyToBeShown({
        message: action.payload.message,
        timeout: action.payload.timeout || 5000
      })))
    )
  ))
)
