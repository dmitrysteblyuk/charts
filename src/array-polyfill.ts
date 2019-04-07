Array.prototype.forEach = function (
  this: any[],
  iterator: (item: any, index: number) => void
) {
  for (let index = 0; index < this.length; index++) {
    iterator(this[index], index);
  }
} as any;

Array.prototype.map = function<V>(
  this: any[],
  mapper: (item: any, index: number) => V
): V[] {
  const result = new Array<V>(this.length);
  for (let index = 0; index < this.length; index++) {
    result[index] = mapper(this[index], index);
  }
  return result;
} as any;
