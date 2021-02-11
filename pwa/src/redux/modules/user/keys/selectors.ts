import { Key } from '@/redux/entities'
import { RootState } from '@/redux/root_reducer'
import { DeepReadonly } from 'ts-essentials'

export const userKeys = (state: RootState): DeepReadonly<Key[]> => state.user.keys.userKeys
export const inProgress = (state: RootState): DeepReadonly<boolean> => state.user.keys.semaphore > 0
