type Dictionary<T, K extends string | number = string> = {
  [key in K]: T;
};

type NumberRange = ReadonlyArray<number>;
type NumericData = ArrayLike<number>;
type MultipleData = ReadonlyArray<NumericData>;

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

interface Array<T> {
  forEach(iterator: (item: T, index: number) => void): void;
  map<V>(mapper: (item: T, index: number) => V): V[];
}
