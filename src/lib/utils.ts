export function forEach<T>(
  object: T,
  iterator: (value: T[keyof T], key: keyof T) => void
) {
  (Object.keys(object) as (keyof T)[]).forEach((key) => {
    iterator(object[key], key);
  });
}

export function map<T, V>(
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
