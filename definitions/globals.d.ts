type Dictionary<T, K extends string = string> = {
  [key in K]: T;
};

type NumberRange = ReadonlyArray<number>;

type Rect = Readonly<{
  top: number;
  left: number;
  width: number;
  height: number;
}>;

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

type CSSProperties = Partial<Omit<
  CSSStyleDeclaration,
  'length' | 'parentRule' | number
>>;

interface Map<K, V> {
  get(key: K): V;
}
