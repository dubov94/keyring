import { container } from 'tsyringe'

export const QRC_ENCODER_TOKEN = 'QrcEncoder'

export interface QrcEncoder {
  encode: (text: string) => Promise<string>;
}

export const getQrcEncoder = () => container.resolve<QrcEncoder>(QRC_ENCODER_TOKEN)
