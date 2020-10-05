import { BehaviorSubject, Subject } from 'rxjs'
import { FullState, constructInitialFullState } from './state'
import { getStore } from './store_di'
import { map, distinctUntilChanged } from 'rxjs/operators'
import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'

export const state$ = new BehaviorSubject<FullState>(constructInitialFullState())

export const createCommitSubject = <T>(namespace: Array<string> | null, type: string) => {
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
