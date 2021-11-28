export type Context<T> = RequiredContext<T> | OptionalContext<T>;

export type RequiredContext<T> = {
  provide: ContextProvider<T>;
  consume: ContextConsumer<T>;
};

export type OptionalContext<T> = {
  provide: ContextProvider<T>;
  consume: OptionalContextConsumer<T>;
};

export type ContextProvider<T> = <U>(value: T, subRoutine: () => U) => U;

export type ContextConsumer<T> = () => T;

export type OptionalContextConsumer<T> = () => T | undefined;
