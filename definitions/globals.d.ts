type Dictionary<T, K extends string = string> = {
  [key in K]: T;
};

type NumberRange = ReadonlyArray<number>;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}
