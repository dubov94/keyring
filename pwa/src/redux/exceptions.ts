import { RootAction } from './root_action'
import { RootState } from './root_reducer'
import { Epic } from 'redux-observable'
import { isActionOf, PayloadActionCreator, TypeConstant } from 'typesafe-actions'
import { concatMap, filter } from 'rxjs/operators'
import { FlowSignal, isSignalException, StandardError } from './flow_signal'
import { EMPTY, of } from 'rxjs'
import { showToast } from './modules/ui/toast/actions'

type SignalActionCreator = PayloadActionCreator<TypeConstant, FlowSignal<any, any, StandardError<any>>>

export const createDisplayExceptionsEpic = (signalActionCreatorOrMany: SignalActionCreator | SignalActionCreator[]): Epic<RootAction, RootAction, RootState> => (action$) => action$.pipe(
  filter(isActionOf(signalActionCreatorOrMany)),
  concatMap((action) => isSignalException(action.payload) ? of(showToast({ message: action.payload.error.message })) : EMPTY)
)
