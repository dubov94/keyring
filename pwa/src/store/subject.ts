import { BehaviorSubject } from 'rxjs'
import { FullState } from './state'

export const state$ = new BehaviorSubject<FullState>({} as FullState)
