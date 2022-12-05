import { function as fn, option } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import { error, RemoteData } from '@/redux/remote_data'
import { StandardError, StandardErrorKind } from '@/redux/flow_signal'

export const remoteDataMappedErrorIndicator = <ApiError, DomainError>(
  apiError: ApiError,
  fromDomainError: (domainError: DeepReadonly<DomainError>) => DeepReadonly<ApiError>) => {
  return <I, S>(
    remoteData: RemoteData<DeepReadonly<I>, DeepReadonly<S>, DeepReadonly<StandardError<DomainError>>>,
    untouchedSinceDispatch: boolean
  ): boolean => {
    return fn.pipe(
      error<I, S, StandardError<DomainError>>(remoteData),
      option.filter((value) => {
        return value.kind === StandardErrorKind.FAILURE &&
          fromDomainError(value.value) === apiError
      }),
      option.map(() => untouchedSinceDispatch),
      option.getOrElse<boolean>(() => false)
    )
  }
}

export const remoteDataErrorIndicator = <E>(apiError: E) => {
  return remoteDataMappedErrorIndicator<E, E>(apiError, (error) => error)
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
