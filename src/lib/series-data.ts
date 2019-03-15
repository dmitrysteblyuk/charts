interface DataArray<T> {
  readonly [index: number]: T;
  readonly length: number;
}

export class SeriesData {
  readonly size: number;
  constructor(
    readonly x: DataArray<number>,
    readonly y: DataArray<number>
  ) {
    this.size = x.length;
  }
}
