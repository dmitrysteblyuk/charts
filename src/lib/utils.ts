const {requestAnimationFrame, cancelAnimationFrame} = window;

export function forEach<T>(
  object: T,
  iterator: (value: T[keyof T], key: keyof T) => void
) {
  for (const key in object) {
    iterator(object[key], key);
  }
}

export function every<T>(
  object: T,
  checker: (value: T[keyof T], key: keyof T) => boolean
) {
  for (const key in object) {
    if (!checker(object[key], key)) {
      return false;
    }
  }
  return true;
}

export function map<T extends {}, V>(
  object: T,
  mapper: (value: T[keyof T], key: keyof T) => V
) {
  const output = {} as {[key in keyof T]: V};
  for (const key in object) {
    output[key] = mapper(object[key], key);
  }
  return output;
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

export function isArrayEqual<T>(
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
    if (!lastArgs || !isArrayEqual(lastArgs, arguments)) {
      lastArgs = arguments;
      lastResult = method.apply(context, arguments as any);
    }
    return lastResult;
  }
}

export function stopAnimation(requestId: number) {
  cancelAnimationFrame(requestId);
}

export function startAnimation(
  callback: (progress: number) => void,
  onRequest: (requestId: number) => void,
  onStop: () => void,
  duration = 200
) {
  let startTime: number | null = null;

  onRequest(requestAnimationFrame(function step(time) {
    if (startTime == null) {
      startTime = time;
    }
    const progress = Math.min(1, (time - startTime) / duration);
    callback(progress);

    if (progress < 1) {
      onRequest(requestAnimationFrame(step));
      return;
    }
    if (onStop) {
      onStop();
    }
  }));
}

export const easeOutCubic = getCubicBezierFunction(0.215, 0.61, 0.355);

export function getCubicBezierFunction(a: number, b: number, c: number) {
  return (x: number) => {
    const y = 1 - x;
    return a * y * y * y + 3 * b * y * y * x + 3 * c * y * x * x + x * x * x;
  };
}
