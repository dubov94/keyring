import { Selector } from '@reduxjs/toolkit'
import isEqual from 'lodash/isEqual'
import { BehaviorSubject, Observable } from 'rxjs'
import { distinctUntilChanged, map } from 'rxjs/operators'
import { DeepReadonly } from 'ts-essentials'
import { RootState } from './conjunction'
import { store } from './store'

export const state$ = new BehaviorSubject<RootState>(store.getState())

store.subscribe(() => {
  state$.next(store.getState())
})

export const apply = <T>(selector: Selector<RootState, DeepReadonly<T>>): Observable<DeepReadonly<T>> => {
  return state$.pipe(map(selector), distinctUntilChanged(isEqual))
}
