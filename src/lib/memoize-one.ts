import {isArrayEqual} from './utils';

export function memoizeOne<T extends (...args: any[]) => any>(
  method: T
): T/* & {clearCache: () => void}*/ {
  let lastArgs: IArguments | undefined;
  let lastResult: any;

  // memoized.clearCache = () => {
  //   lastArgs = lastResult = undefined;
  // };

  return memoized as T;

  function memoized() {
    const newArgs = arguments;
    if (!lastArgs || !isArrayEqual(lastArgs, newArgs)) {
      lastArgs = newArgs;
      lastResult = method.apply(null, lastArgs as any);
    }
    return lastResult;
  }
}
