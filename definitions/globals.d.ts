type IDict<T, K extends string = string> = {
  [n in K]: T;
};
