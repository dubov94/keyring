import { RootState } from '@/redux/conjunction'

export const getRegistrationProgress = (state: RootState) => state.authn.registrationProgress
