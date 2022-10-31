import { AnyAction } from '@reduxjs/toolkit'
import {
  isActionOf,
  PayloadAction,
  PayloadActionCreator,
  PayloadMetaAction,
  PayloadMetaActionCreator,
  TypeConstant
} from 'typesafe-actions'

export enum FlowSignalKind {
  INDICATOR = 'INDICATOR',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  CANCEL = 'CANCEL'
}

export interface FlowIndicator<T> {
  kind: FlowSignalKind.INDICATOR;
  value: T;
}

export const indicator = <T>(value: T): FlowIndicator<T> => ({
  kind: FlowSignalKind.INDICATOR,
  value
})

export interface FlowSuccess<T> {
  kind: FlowSignalKind.SUCCESS;
  data: T;
}

export const success = <T>(data: T): FlowSuccess<T> => ({
  kind: FlowSignalKind.SUCCESS,
  data
})

export enum StandardErrorKind {
  EXCEPTION = 'EXCEPTION',
  FAILURE = 'FAILURE',
}

export interface StandardErrorFailure<E> {
  kind: StandardErrorKind.FAILURE;
  value: E;
}

export interface StandardErrorException {
  kind: StandardErrorKind.EXCEPTION;
  message: string;
}

export type StandardError<E> = StandardErrorFailure<E> | StandardErrorException

export const isFailureOf = <E>(es: E[]) => (error: StandardError<E>) => {
  return error.kind === StandardErrorKind.FAILURE && es.includes(error.value)
}

export interface FlowError<E> {
  kind: FlowSignalKind.ERROR;
  error: E;
}

export const failure = <E>(value: E): FlowError<StandardError<E>> => ({
  kind: FlowSignalKind.ERROR,
  error: {
    kind: StandardErrorKind.FAILURE,
    value
  }
})

export const errorToMessage = (error: any): string => {
  if (error instanceof Response) {
    return `http.cat/${error.status}`
  }
  return `${error}`
}

export const exception = <E>(message: string): FlowError<StandardError<E>> => ({
  kind: FlowSignalKind.ERROR,
  error: {
    kind: StandardErrorKind.EXCEPTION,
    message
  }
})

export interface FlowCancel {
  kind: FlowSignalKind.CANCEL;
}

export const cancel = (): FlowCancel => ({
  kind: FlowSignalKind.CANCEL
})

export type FlowFinale<S, E> = FlowSuccess<S> | FlowError<E> | FlowCancel
export type FlowSignal<I, S, E> = FlowIndicator<I> | FlowFinale<S, E>

const isKindSuccess = (kind: FlowSignalKind) => kind === FlowSignalKind.SUCCESS

const isKindError = (kind: FlowSignalKind) => kind === FlowSignalKind.ERROR

const isKindFinale = (kind: FlowSignalKind) => {
  return [FlowSignalKind.SUCCESS, FlowSignalKind.ERROR, FlowSignalKind.CANCEL].includes(kind)
}

export const isSignalSuccess = (signal: FlowSignal<unknown, unknown, unknown>): signal is FlowSuccess<unknown> => {
  return isKindSuccess(signal.kind)
}

export const isSignalError = (signal: FlowSignal<unknown, unknown, unknown>): signal is FlowError<unknown> => {
  return isKindError(signal.kind)
}

export const isSignalFailure = <E>(signal: FlowSignal<unknown, unknown, StandardError<E>>): signal is FlowError<StandardErrorFailure<E>> => {
  return isKindError(signal.kind) && (<FlowError<StandardError<E>>>signal).error.kind === StandardErrorKind.FAILURE
}

export const isSignalException = (signal: FlowSignal<unknown, unknown, StandardError<unknown>>): signal is FlowError<StandardErrorException> => {
  return isKindError(signal.kind) && (<FlowError<StandardError<unknown>>>signal).error.kind === StandardErrorKind.EXCEPTION
}

export const isSignalFinale = (signal: FlowSignal<unknown, unknown, unknown>) => {
  return isKindFinale(signal.kind)
}

// https://github.com/microsoft/TypeScript/blob/main/doc/spec-ARCHIVED.md#411-arrow-functions
export function isActionSuccess<T extends TypeConstant, I, S, E>(
  actionCreator: PayloadActionCreator<T, FlowSignal<I, S, E>>
): (action: AnyAction) => action is PayloadAction<T, FlowSuccess<S>>
export function isActionSuccess<T extends TypeConstant, I, S, E, M>(
  actionCreator: PayloadMetaActionCreator<T, FlowSignal<I, S, E>, M>
): (action: AnyAction) => action is PayloadMetaAction<T, FlowSuccess<S>, M>
export function isActionSuccess (actionCreator: any) {
  return (action: AnyAction) => isActionOf(actionCreator, action) && isSignalSuccess(action.payload)
}

export const isActionSuccess2 = <
  T1 extends TypeConstant, I1, S1, E1,
  T2 extends TypeConstant, I2, S2, E2,
  >(
    actionCreators: [
      PayloadActionCreator<T1, FlowSignal<I1, S1, E1>>,
      PayloadActionCreator<T2, FlowSignal<I2, S2, E2>>
    ]
  ) => (action: AnyAction): action is PayloadAction<T1, FlowSuccess<S1>>
    | PayloadAction<T2, FlowSuccess<S2>> => {
    return isActionOf(actionCreators, action) && isSignalSuccess(action.payload)
  }

export const mapper = <I1, S1, E1, I2, S2, E2>(
  indicatorMapper: (indicator: I1) => I2,
  successMapper: (success: S1) => S2,
  errorMapper: (error: E1) => E2
) => (signal: FlowSignal<I1, S1, E1>): FlowSignal<I2, S2, E2> => {
    switch (signal.kind) {
      case FlowSignalKind.INDICATOR:
        return indicator(indicatorMapper(signal.value))
      case FlowSignalKind.SUCCESS:
        return success(successMapper(signal.data))
      case FlowSignalKind.ERROR:
        return { kind: FlowSignalKind.ERROR, error: errorMapper(signal.error) }
      case FlowSignalKind.CANCEL:
        return cancel()
    }
  }
