declare module '*.worker.ts' {
  type F = (...args: any[]) => any;
  type Async<T extends F> = ReturnType<T> extends Promise<any> ? T : (...args: Parameters<T>) => Promise<ReturnType<T>>;
  type WorkerWithMethods<T> = Worker & { [K in keyof T]: T[K] extends F ? Async<T[K]> : never };
  function createWorkerWithMethods<T>(): WorkerWithMethods<T>;
  export = createWorkerWithMethods;
}
