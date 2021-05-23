import { RootState } from '@/redux/root_reducer'

export const isDepotActive = (state: RootState): boolean => state.depot.username !== null
export const depotUsername = (state: RootState): string | null => state.depot.username
