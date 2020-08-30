import { BehaviorSubject, Subject } from 'rxjs'
import { FullState, constructInitialFullState } from './state'
import { getStore } from './injections'

export const state$ = new BehaviorSubject<FullState>(constructInitialFullState())

export const createCommitSubject = <T>(type: string) => {
  const subject = new Subject<T>()
  subject.subscribe((value) => {
    getStore().commit(type, value)
  })
  return subject
}
