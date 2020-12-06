import { RootState } from '@/redux/conjunction'

export const getSessionUsername = (state: RootState) => state.session.username
