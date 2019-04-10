import {isArrayEqual} from './utils';

export function memoize<T extends (...args: any[]) => any>(
  method: T,
  cacheSize: number
): T/* & {clearCache: () => void}*/ {
  const lastArgs: IArguments[] = [];
  const lastResults: any[] = [];

  // memoized.clearCache = () => {
  //   lastArgs = [];
  //   lastResults = [];
  // };

  return memoized as T;

  function memoized() {
    const newArgs = arguments;
    const index = lastArgs.findIndex((args) => isArrayEqual(args, newArgs));
    if (index !== -1) {
      return lastResults[index];
    }

    const result = method.apply(null, newArgs as any);
    lastArgs.unshift(newArgs);
    lastResults.unshift(result);

    if (lastArgs.length > cacheSize) {
      lastArgs.pop();
      lastResults.pop();
    }
    return result;
  }
}
