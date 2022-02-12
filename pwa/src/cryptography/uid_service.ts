import { container } from 'tsyringe'

export const UID_SERVICE_TOKEN = 'UidService'

export interface UidService {
  v4: () => string;
}

export const getUidService = () => container.resolve<UidService>(UID_SERVICE_TOKEN)
