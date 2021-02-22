import { AnyAction, Reducer, Store } from '@reduxjs/toolkit'
import { ActionsObservable, StateObservable } from 'redux-observable'
import { Observable, Subject } from 'rxjs'
import { RootAction } from './root_action'
import { RootState } from './root_reducer'
import last from 'lodash/last'

export const setUpEpicChannels = (store: Store<RootState, RootAction>) => {
  const actionSubject = new Subject<RootAction>()
  const action$ = new ActionsObservable(actionSubject)
  const stateSubject = new Subject<RootState>()
  const state$ = new StateObservable(stateSubject, store.getState())
  store.subscribe(() => {
    stateSubject.next(store.getState())
  })
  return {
    actionSubject,
    action$,
    stateSubject,
    state$
  }
}

type Resolver<T> = (value: T | PromiseLike<T>) => void

type Rejecter = (reason?: any) => void

interface Future<T> {
  resolve: Resolver<T>;
  reject: Rejecter;
  future: Promise<T>;
}

const newFuture = <T>(): Future<T> => {
  let resolvePromise: Resolver<T>
  let rejectPromise: Rejecter
  const future = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return {
    resolve: resolvePromise!,
    reject: rejectPromise!,
    future
  }
}

export class EpicTracker {
  private emissions: Future<RootAction>[] = []
  private index: number
  private completion: Future<void>

  constructor (epic: Observable<RootAction>) {
    this.completion = newFuture()
    this.emissions.push(newFuture())
    this.index = 0
    epic.subscribe({
      next: (action) => {
        last(this.emissions)!.resolve(action)
        this.emissions.push(newFuture())
      },
      error: (err) => { this.completion.reject(err) },
      complete: () => { this.completion.resolve() }
    })
  }

  getTailLength (): number {
    return this.emissions.length - this.index - 1
  }

  nextEmission (): Promise<RootAction> {
    return this.emissions[this.index++].future
  }

  waitForCompletion (): Promise<void> {
    return this.completion.future
  }
}

export const drainEpicActions = async (tracker: EpicTracker) => {
  const actions = []
  while (tracker.getTailLength() > 0) {
    actions.push(await tracker.nextEmission())
  }
  return actions
}

export const reduce = <S, A extends AnyAction>(reducer: Reducer<S>, initialState: S | undefined, actions: A[]): S => {
  return <S>actions.reduce<S | undefined>(reducer, initialState)
}
