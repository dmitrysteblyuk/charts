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

  getRange(
    startIndex: number,
    endIndex: number,
    initialMinIndex: number,
    initialMaxIndex: number
  ) {
    return getValuesRangeSimple(
      startIndex,
      endIndex,
      initialMinIndex,
      initialMaxIndex,
      this.y
    );
  }
}

function getValuesRangeSimple(
  startIndex: number,
  endIndex: number,
  initialMinIndex: number,
  initialMaxIndex: number,
  values: DataArray<number>
): NumberRange {
  let minIndex = initialMinIndex;
  let maxIndex = initialMaxIndex;

  for (let index = startIndex; index < endIndex; index++) {
    if (values[minIndex] > values[index]) {
      minIndex = index;
    } else if (values[maxIndex] < values[index]) {
      maxIndex = index;
    }
  }
  return [minIndex, maxIndex];
}
