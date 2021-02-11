import { RootState } from '@/redux/root_reducer'

export const depotUsername = (state: RootState): string | null => state.depot.username
