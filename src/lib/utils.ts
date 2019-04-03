export function forEach<T>(
  object: T,
  iterator: (value: T[keyof T], key: keyof T) => void
) {
  (Object.keys(object) as (keyof T)[]).forEach((key) => {
    iterator(object[key], key);
  });
}

export function map<T extends {}, V>(
  object: T,
  mapper: (value: T[keyof T], key: keyof T) => V
) {
  const output = {} as {[key in keyof T]: V};
  forEach(object, (value, key) => {
    output[key] = mapper(value, key);
  });
  return output;
}

export function newArray<T>(length: number, creator: (index: number) => T) {
  return Array.from(new Array(length)).map((_, index) => creator(index));
}

export function groupBy<T>(array: T[], isSameGroup: (a: T, b: T) => boolean) {
  return array.reduce<T[][]>((result, item) => {
    const index = result.findIndex((group) => isSameGroup(group[0], item));
    if (index < 0) {
      result.push([item]);
    } else {
      result[index].push(item);
    }
    return result;
  }, []);
}

export function roundRange(min: number, max: number) {
  const roundedMin = Math.round(min);
  const roundedMax = Math.round(max);

  if (roundedMin < roundedMax || !(min < max)) {
    return [roundedMin, roundedMax];
  }
  return [Math.floor(min), Math.ceil(max)];
}

export function arrayIsEqual<T>(
  a: ArrayLike<T>,
  b: ArrayLike<T>
): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

export function isPositive(x: number): boolean {
  return x > 0 && isFinite(x);
}

export function memoizeOne<T extends (...args: any[]) => any>(
  method: T,
  context?: any
): T & {clearCache: () => void} {
  let lastArgs: IArguments | undefined;
  let lastResult: any;

  memoized.clearCache = () => {
    lastArgs = lastResult = undefined;
  };

  return memoized as any;

  function memoized() {
    if (!lastArgs || !arrayIsEqual(lastArgs, arguments)) {
      lastArgs = arguments;
      lastResult = method.apply(context, arguments as any);
    }
    return lastResult;
  }
}

export function setProps<T, K extends keyof T = keyof T>(
  object: T,
  props: Pick<T, K>
): T {
  forEach(props, (value, key) => object[key] = value);
  return object;
}
