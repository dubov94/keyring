import { BehaviorSubject, Observable, Subject } from 'rxjs'
import { FullState, constructInitialFullState, ReduxFullState, reduxConstructInitialFullState } from './state'
import { getStore } from './store_di'
import { map, distinctUntilChanged } from 'rxjs/operators'
import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'
import { Selector } from '@reduxjs/toolkit'
import { DeepReadonly } from 'ts-essentials'

export const state$ = new BehaviorSubject<FullState>(constructInitialFullState())

export const createMutation = <T>(namespace: Array<string> | null, type: string) => {
  const subject = new Subject<T>()
  const fullType = namespace === null ? type : `${namespace.join('/')}/${type}`
  subject.subscribe((value) => {
    getStore().commit(fullType, cloneDeep(value))
  })
  return subject
}

export const createGetter = <T>(mapper: (state: FullState) => T): BehaviorSubject<T> => {
  const subject = new BehaviorSubject<T>(cloneDeep(mapper(state$.getValue())))
  state$.pipe(map(mapper), distinctUntilChanged(isEqual), map(cloneDeep)).subscribe(subject)
  return subject
}

export const reduxState$ = new BehaviorSubject<ReduxFullState>(reduxConstructInitialFullState())

export const applySelector = <T>(selector: Selector<ReduxFullState, DeepReadonly<T>>): Observable<DeepReadonly<T>> => {
  return reduxState$.pipe(map(selector), distinctUntilChanged(isEqual))
}
