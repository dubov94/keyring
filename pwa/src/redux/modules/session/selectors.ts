import { RootState } from '@/redux/root_reducer'
import { DeepReadonly } from 'ts-essentials'

export const sessionUsername = (state: RootState): DeepReadonly<string | null> => state.session.username
