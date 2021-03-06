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

export interface ItemGroup<T, K> {
  items: T[];
  key: K;
}

export function groupBy<T, K>(
  array: T[],
  getGroupKey: (a: T) => K
) {
  return array.reduce<ItemGroup<T, K>[]>((result, item) => {
    const key = getGroupKey(item);
    const index = result.findIndex((group) => group.key === key);
    if (index < 0) {
      result.push({items: [item], key});
    } else {
      result[index].items.push(item);
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

export function getLinearScale([d0, d1]: NumberRange, [r0, r1]: NumberRange) {
  const factor = (r1 - r0) / (d1 - d0);
  const offset = r1 - d1 * factor;
  return (x: number) => factor * x + offset;
}
