import { AnyAction, Reducer, Store } from '@reduxjs/toolkit'
import { ActionsObservable, StateObservable } from 'redux-observable'
import { Observable, Subject } from 'rxjs'
import { RootAction } from './root_action'
import { RootState } from './root_reducer'

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

export class EpicTracker {
  private output: RootAction[] = []
  private completion: Promise<void>

  constructor (epic: Observable<RootAction>, subscriber: null | ((action: RootAction) => void) = null) {
    let resolvePromise: (value: void | PromiseLike<void>) => void
    let rejectPromise: (reason: any) => void
    this.completion = new Promise((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject
    })
    epic.subscribe({
      next: (action) => {
        if (subscriber !== null) {
          subscriber(action)
        }
        this.output.push(action)
      },
      error: (err) => { rejectPromise(err) },
      complete: () => { resolvePromise() }
    })
  }

  waitForCompletion (): Promise<void> {
    return this.completion
  }

  getActions (): RootAction[] {
    return this.output
  }
}

export const epicReactionSequence = (reactions: ((action: RootAction) => void)[]) => {
  let index = 0
  return (action: RootAction) => {
    reactions[index++](action)
  }
}

export const reduce = <S, A extends AnyAction>(reducer: Reducer<S>, initialState: S | undefined, actions: A[]): S => {
  return <S>actions.reduce<S | undefined>(reducer, initialState)
}
