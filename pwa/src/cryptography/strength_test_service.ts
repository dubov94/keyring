import { container } from 'tsyringe'
import zxcvbn from 'zxcvbn'

export const STRENGTH_TEST_SERVICE_TOKEN = 'StrengthTestService'

export enum Color {
  RED = 'RED',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN'
}

export interface Score {
  // In [0; 1].
  value: number;
  color: Color;
}

export interface StrengthTestService {
  score: (password: string, inputs: string[]) => Score;
}

const getColorByScore = (score: number): Color => {
  if (score < 2) {
    return Color.RED
  }
  if (score < 3) {
    return Color.YELLOW
  }
  return Color.GREEN
}

export class ZxcvbnService implements StrengthTestService {
  score (password: string, inputs: string[]): Score {
    if (password.length > 64) {
      return { value: 0, color: Color.GREEN }
    }
    const { score } = zxcvbn(password, inputs)
    return {
      value: score / 4,
      color: getColorByScore(score)
    }
  }
}

export const getStrengthTestService = () => {
  return container.resolve<StrengthTestService>(STRENGTH_TEST_SERVICE_TOKEN)
}
