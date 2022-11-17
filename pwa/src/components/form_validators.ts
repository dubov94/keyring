import { function as fn, option } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import { error, RemoteData } from '@/redux/remote_data'
import { StandardError, StandardErrorKind } from '@/redux/flow_signal'

export const remoteDataErrorIndicator = <E>(apiError: E) => {
  return <I, S>(
    remoteData: RemoteData<DeepReadonly<I>, DeepReadonly<S>, DeepReadonly<StandardError<E>>>,
    untouchedSinceDispatch: boolean
  ): boolean => {
    return fn.pipe(
      error<I, S, StandardError<E>>(remoteData),
      option.filter((value) => value.kind === StandardErrorKind.FAILURE && value.value === apiError),
      option.map(() => untouchedSinceDispatch),
      option.getOrElse<boolean>(() => false)
    )
  }
}
