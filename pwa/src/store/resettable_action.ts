export enum ResettableActionType {
  ACT = 'ACT',
  RESET = 'RESET',
}

export interface ResettableActionReset {
  type: ResettableActionType.RESET;
}

export type ResettableActionAct<T> = {
  type: ResettableActionType.ACT;
} & T

export type ResettableAction<T> = ResettableActionAct<T> | ResettableActionReset

export const act = <T>(payload: T): ResettableAction<T> => ({
  type: ResettableActionType.ACT,
  ...payload
})

export const reset = <T>(): ResettableAction<T> => ({
  type: ResettableActionType.RESET
})
