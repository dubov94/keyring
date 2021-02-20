import { option, function as fn, these } from 'fp-ts'
import { FlowSignal, FlowSignalKind } from './flow_signal'
import { DeepReadonly } from 'ts-essentials'

export type RemoteResult<S, E> = these.These<S, E>

export interface RemoteData<I, S, E> {
  indicator: option.Option<I>;
  result: option.Option<RemoteResult<S, E>>;
}

export const zero = <I, S, E>(): RemoteData<I, S, E> => ({
  indicator: option.zero(),
  result: option.zero()
})

export const identity = <T>() => (value: T) => fn.identity<T>(value)

const withError = <S, E>(remoteResult: option.Option<RemoteResult<S, E>>, error: E): RemoteResult<S, E> => {
  return option.fold<these.These<S, E>, these.These<S, E>>(
    () => these.right(error),
    (instance) => these.fold<S, E, these.These<S, E>>(
      (left) => these.both(left, error),
      () => these.right(error),
      (left) => these.both(left, error)
    )(instance)
  )(remoteResult)
}

export const reducer = <RDI, RDS, RDE, FSI, FSS, FSE>(
  indicatorMapper: (fsi: FSI) => RDI,
  successMapper: (fss: FSS) => RDS,
  errorMapper: (fse: FSE) => RDE
) => (
    remoteData: RemoteData<RDI, RDS, RDE>,
    flowSignal: FlowSignal<FSI, FSS, FSE>
  ): RemoteData<RDI, RDS, RDE> => {
    switch (flowSignal.kind) {
      case FlowSignalKind.INDICATOR:
        return { indicator: option.of(indicatorMapper(flowSignal.value)), result: remoteData.result }
      case FlowSignalKind.SUCCESS:
        return { indicator: option.zero(), result: option.of(these.left(successMapper(flowSignal.data))) }
      case FlowSignalKind.ERROR:
        return {
          indicator: option.zero(),
          result: option.of(withError(remoteData.result, errorMapper(flowSignal.error)))
        }
      case FlowSignalKind.CANCEL:
        return { indicator: option.zero(), result: remoteData.result }
    }
  }

export const withNoResult = <I, S, E>(remoteData: RemoteData<I, S, E>): RemoteData<I, S, E> => ({
  indicator: remoteData.indicator,
  result: option.zero()
})

export const error = <I, S, E>(remoteData: RemoteData<DeepReadonly<I>, DeepReadonly<S>, DeepReadonly<E>>): option.Option<DeepReadonly<E>> => {
  return option.isSome(remoteData.indicator) ? option.zero() : fn.pipe(remoteData.result, option.chain(these.getRight))
}

export const data = <I, S, E>(remoteData: RemoteData<DeepReadonly<I>, DeepReadonly<S>, DeepReadonly<E>>): option.Option<DeepReadonly<S>> => {
  return fn.pipe(
    remoteData.result,
    option.chain(these.getLeft)
  )
}

export const hasIndicator = <I, S, E>(remoteData: RemoteData<DeepReadonly<I>, DeepReadonly<S>, DeepReadonly<E>>): boolean => {
  return option.isSome(remoteData.indicator)
}

export const hasData = <I, S, E>(remoteData: RemoteData<DeepReadonly<I>, DeepReadonly<S>, DeepReadonly<E>>): boolean => {
  return fn.pipe(
    remoteData.result,
    option.map(these.isLeft),
    option.getOrElse<boolean>(() => false)
  )
}
