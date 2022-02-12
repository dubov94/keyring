import { Epic } from 'redux-observable'
import { EMPTY, of } from 'rxjs'
import { concatMap, filter } from 'rxjs/operators'
import { isActionOf, PayloadActionCreator, PayloadMetaActionCreator, TypeConstant } from 'typesafe-actions'
import { FlowSignal, isSignalException, StandardError } from './flow_signal'
import { showToast } from './modules/ui/toast/actions'
import { RootAction } from './root_action'
import { RootState } from './root_reducer'

type SignalActionCreator<I, S, E, M>
  = PayloadActionCreator<TypeConstant, FlowSignal<I, S, StandardError<E>>>
  | PayloadMetaActionCreator<TypeConstant, FlowSignal<I, S, StandardError<E>>, M>

export const createDisplayExceptionsEpic = <I, S, E, M>(
  signalActionCreatorOrMany: SignalActionCreator<I, S, E, M> | SignalActionCreator<I, S, E, M>[]
): Epic<RootAction, RootAction, RootState> => (action$) => action$.pipe(
    filter(isActionOf(signalActionCreatorOrMany)),
    concatMap((action) => isSignalException(action.payload) ? of(showToast({ message: action.payload.error.message })) : EMPTY)
  )
