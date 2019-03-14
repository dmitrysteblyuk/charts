interface DataArray<T> {
  readonly [index: number]: T;
  readonly length: number;
}

export class TimeSeriesData {
  readonly size: number;
  constructor(
    readonly times: DataArray<number>,
    readonly values: DataArray<number>
  ) {
    this.size = times.length;
  }
}
