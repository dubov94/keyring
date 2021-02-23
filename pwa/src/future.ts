export type Resolver<T> = (value: T | PromiseLike<T>) => void

export type Rejecter = (reason?: any) => void

export interface Future<T> {
  resolve: Resolver<T>;
  reject: Rejecter;
  promise: Promise<T>;
}

export const newFuture = <T>(): Future<T> => {
  let resolvePromise: Resolver<T>
  let rejectPromise: Rejecter
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return {
    resolve: resolvePromise!,
    reject: rejectPromise!,
    promise
  }
}
