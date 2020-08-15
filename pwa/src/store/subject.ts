import { BehaviorSubject } from 'rxjs'
import { FullState } from './root/state'

export const state$ = new BehaviorSubject<FullState>({} as FullState)
