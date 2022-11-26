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

// if_change(username_pattern)
const USERNAME_PATTERN = /^\w{3,64}$/
// then_change(
//   pwa/src/i18n.ts:username_pattern_mismatch,
//   server/main/services/Validators.java:username_pattern,
// )

export const checkUsername = (username: string): boolean => {
  return USERNAME_PATTERN.test(username)
}
