/**
 * Each context has a corresponding value stack that stores
 * the context's values.
 *
 * Anytime a context is created, a corresponding stack is also
 * created within this object, indexed by a unique symbol.
 */
const contextsStacks: Record<symbol, Array<unknown>> = {};

/**
 * Creates a context value stack indexed by a given symbol.
 */
const createContextStack = <T>(symbol: symbol) => {
  contextsStacks[symbol] = [] as Array<T>;
};

/**
 * Pushes a value to the context stack that corresponds
 * to the given symbol.
 */
const pushContextValue = <T>(symbol: symbol, value: T) => {
  contextsStacks[symbol].push(value);
};

/**
 * Pops a value to the context stack that corresponds
 * to the given symbol.
 */
const popContextValue = (symbol: symbol) => {
  contextsStacks[symbol].pop();
};

/**
 * Returns the current (most recent) value associated
 * with a given context, that is, the value which is at
 * the top of the stack.
 */
const getContextCurrentValue = <T>(symbol: symbol) => {
  const contextStack = contextsStacks[symbol];
  const lastIndex = contextStack.length - 1;
  const currentValue = contextStack[lastIndex];

  // The context stack might be empty,
  // therefore the result might be undefined
  return currentValue as T | undefined;
};

/**
 * Creates the "consume" function for a required context,
 * which means that if the stack is empty it throws an exception.
 */
const makeConsumeRequiredContextValue =
  <T>(symbol: symbol) =>
  () => {
    const currentValue = getContextCurrentValue<T>(symbol);

    if (!currentValue) {
      const errorMessage = `There is no context value available in this scope!
      You must provide a context value somewhere up in the call stack or use createOptionalContext() instead of createContext() if you wish to consume a context value without a provider (e.g. by using default values).`;

      throw new NoProviderError(errorMessage);
    }

    return currentValue;
  };

/**
 * Creates the "consume" function for an optional context.
 */
const makeConsumeOptionalContextValue =
  <T>(symbol: symbol) =>
  () => {
    return getContextCurrentValue<T>(symbol);
  };

const makeCurriedProvideContextValue =
  <T>(symbol: symbol) =>
  (value: T) => {
    pushContextValue(symbol, value);

    return <U>(subRoutine: () => U) => {
      const returnValue = subRoutine();

      popContextValue(symbol);

      return returnValue;
    };
  };

type ProvideContextValue<T> = {
  (value: T): <U>(subRoutine: () => U) => U;
  <U>(value: T, subRoutine?: () => U): U;
};

const makeProvideContextValue =
  <T>(symbol: symbol): ProvideContextValue<T> =>
  <U>(value: T, subRoutine?: () => U) => {
    const curriedProvideContextValue =
      makeCurriedProvideContextValue<T>(symbol);

    const loadedProvider = curriedProvideContextValue(value);

    if (subRoutine) {
      return loadedProvider(subRoutine);
    }

    return loadedProvider;
  };

export const createContext = <T>() => {
  const symbol = Symbol("Context");

  createContextStack<T>(symbol);

  const provide = makeProvideContextValue<T>(symbol);

  const consume = makeConsumeRequiredContextValue<T>(symbol);

  return {
    provide,
    consume,
  };
};

export const createOptionalContext = <T>() => {
  const symbol = Symbol("Context");

  createContextStack<T>(symbol);

  const provide = makeProvideContextValue<T>(symbol);

  const consume = makeConsumeOptionalContextValue<T>(symbol);

  return {
    provide,
    consume,
  };
};

export const composeProviders = (
  ...loadedProviders: Array<<U>(subRoutine: () => U) => U>
) => {
  return <U>(subRoutine: () => U) => {
    const result = loadedProviders.reverse().reduce((previous, current) => {
      return () => current(previous);
    }, subRoutine);

    return result();
  };
};

export class NoProviderError extends Error {
  constructor(message: string) {
    super(message);
  }
}
