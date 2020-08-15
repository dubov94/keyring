import { Subject } from 'rxjs'
import { FullState } from './root/state'

export const state$ = new Subject<FullState>()
