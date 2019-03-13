export function forEach<T>(
  object: T,
  iterator: (value: T[keyof T], key: keyof T) => void
) {
  (Object.keys(object) as (keyof T)[]).forEach((key) => {
    iterator(object[key], key);
  });
}
