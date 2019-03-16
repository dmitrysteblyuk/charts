type Dictionary<T, K extends string = string> = {
  [key in K]: T;
};
type NumberRange = ReadonlyArray<number>;
