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
  a: ReadonlyArray<T>,
  b: ReadonlyArray<T>
): boolean {
  return (
    a === b ||
    a.length === b.length &&
    a.every((item, index) => item === b[index])
  );
}

export function isPositive(x: number): boolean {
  return x > 0 && isFinite(x);
}
