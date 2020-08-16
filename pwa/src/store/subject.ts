import { BehaviorSubject } from 'rxjs'
import { FullState, constructInitialFullState } from './state'

export const state$ = new BehaviorSubject<FullState>(constructInitialFullState())
