export enum FlowProgressBasicState {
  IDLE = 'IDLE',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

export type FlowProgressState<S> = FlowProgressBasicState | S;

export enum FlowProgressErrorType {
  EXCEPTION = 'EXCEPTION',
  FAILURE = 'FAILURE',
}

export interface FlowErrorFailure<E> {
  type: FlowProgressErrorType.FAILURE;
  error: E;
}

export interface FlowErrorException {
  type: FlowProgressErrorType.EXCEPTION;
  message: string;
}

export interface FlowProgressError<E> {
  state: FlowProgressBasicState.ERROR;
  error: FlowErrorFailure<E> | FlowErrorException;
}

export interface FlowProgressSuccess<T> {
  state: FlowProgressBasicState.SUCCESS;
  data: T;
}

export type FlowProgressIndicatorState<S> = Exclude<FlowProgressState<S>, FlowProgressBasicState.ERROR | FlowProgressBasicState.SUCCESS>

export interface FlowProgressIndicator<S, T> {
  state: FlowProgressIndicatorState<S>;
  stallData: T;
}

export type FlowProgress<S, T, E> = FlowProgressIndicator<S, T> | FlowProgressError<E> | FlowProgressSuccess<T>

export const indicator = <S, T>(state: FlowProgressIndicatorState<S>, value: T): FlowProgressIndicator<S, T> => ({
  state: state,
  stallData: value
})

export const success = <T>(value: T): FlowProgressSuccess<T> => ({
  state: FlowProgressBasicState.SUCCESS,
  data: value
})

export const data = <S, T, E>(progress: FlowProgress<S, T, E>, fallback: T): T => {
  switch (progress.state) {
    case FlowProgressBasicState.SUCCESS:
      return (progress as FlowProgressSuccess<T>).data
    case FlowProgressBasicState.ERROR:
      return fallback
    default:
      return (progress as FlowProgressIndicator<S, T>).stallData
  }
}

export const exception = <E>(message: string): FlowProgressError<E> => ({
  state: FlowProgressBasicState.ERROR,
  error: {
    type: FlowProgressErrorType.EXCEPTION,
    message
  }
})

export const stringify = (object: any): string => JSON.stringify(object)

export const failure = <E>(error: E): FlowProgressError<E> => ({
  state: FlowProgressBasicState.ERROR,
  error: {
    type: FlowProgressErrorType.FAILURE,
    error
  }
})

export const isError = <S, T, E>(progress: FlowProgress<S, T, E>) =>
  progress.state === FlowProgressBasicState.ERROR
