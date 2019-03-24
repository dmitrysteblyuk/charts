interface DataArray<T> {
  readonly [index: number]: T;
  readonly length: number;
}

const ClusterArray = Uint32Array;
type ClusterType = Uint32Array;

export class SeriesData {
  readonly size: number;
  private lows: ClusterType | undefined;
  private highs: ClusterType | undefined;
  private clusterLength: number | undefined;

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
    if (!this.clusterLength) {
      return getValuesRangeSimple(
        startIndex,
        endIndex,
        initialMinIndex,
        initialMaxIndex,
        this.y
      );
    }
    return getValuesRangeFast(
      startIndex,
      endIndex,
      initialMinIndex,
      initialMaxIndex,
      this.y,
      this.clusterLength,
      this.lows as ClusterType,
      this.highs as ClusterType
    );
  }

  splitToClusters(pixels: number) {
    if (this.clusterLength !== undefined) {
      return;
    }

    const {size} = this;
    const count = Math.round(Math.sqrt(size * pixels / 2));
    const clusterLength = Math.ceil(size / count);
    if (!(clusterLength > 3)) {
      this.clusterLength = 0;
      return;
    }

    this.clusterLength = clusterLength;
    this.lows = new ClusterArray(count);
    this.highs = new ClusterArray(count);

    for (let groupIndex = 0; groupIndex < count; groupIndex++) {
      const index = groupIndex * clusterLength;
      const [minIndex, maxIndex] = getValuesRangeSimple(
        index + 1,
        Math.min(size, index + clusterLength),
        index,
        index,
        this.y
      );
      this.lows[groupIndex] = minIndex;
      this.highs[groupIndex] = maxIndex;
    }
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

function getValuesRangeFast(
  startIndex: number,
  endIndex: number,
  initialMinIndex: number,
  initialMaxIndex: number,
  values: DataArray<number>,
  clusterLength: number,
  lows: ClusterType,
  highs: ClusterType
): NumberRange {
  let minIndex = initialMinIndex;
  let maxIndex = initialMaxIndex;
  const groupStartIndexInclusive = Math.floor(startIndex / clusterLength);
  const groupEndIndexInclusive = Math.ceil(endIndex / clusterLength);

  if (groupStartIndexInclusive >= groupEndIndexInclusive - 1) {
    updateInsideSameGroup(startIndex, endIndex, groupStartIndexInclusive);
    return [minIndex, maxIndex];
  }

  const groupStartIndexExclusive = Math.ceil(startIndex / clusterLength);
  const groupEndIndexExclusive = Math.floor(endIndex / clusterLength);

  if (groupStartIndexExclusive < groupEndIndexExclusive) {
    for (
      let index = groupStartIndexExclusive;
      index < groupEndIndexExclusive;
      index++
    ) {
      if (values[minIndex] > values[lows[index]]) {
        minIndex = lows[index];
      }
      if (values[maxIndex] < values[highs[index]]) {
        maxIndex = highs[index];
      }
    }
  }

  const clusterStartIndex = groupStartIndexExclusive * clusterLength;
  if (startIndex < clusterStartIndex) {
    updateInsideSameGroup(
      startIndex,
      clusterStartIndex,
      groupStartIndexInclusive
    );
  }

  const clusterEndIndex = groupEndIndexExclusive * clusterLength;
  if (endIndex > clusterEndIndex) {
    updateInsideSameGroup(
      clusterEndIndex,
      endIndex,
      groupEndIndexExclusive
    );
  }
  return [minIndex, maxIndex];

  function updateInsideSameGroup(
    fromIndex: number,
    toIndex: number,
    groupIndex: number
  ) {
    // means the given interval ([fromIndex, toIndex]) is inside same cluster
    const lowIndex = lows[groupIndex];
    const isMinInside = lowIndex >= startIndex && lowIndex < endIndex;
    if (isMinInside && values[minIndex] > values[lowIndex]) {
      minIndex = lowIndex;
    }

    const highIndex = highs[groupIndex];
    const isMaxInside = highIndex >= startIndex && highIndex < endIndex;
    if (isMaxInside && values[maxIndex] < values[highIndex]) {
      maxIndex = highIndex;
    }

    if (isMinInside && isMaxInside) {
      return;
    }
    for (let index = fromIndex; index < toIndex; index++) {
      if (!isMinInside && values[minIndex] > values[index]) {
        minIndex = index;
      } else if (!isMaxInside && values[maxIndex] < values[index]) {
        maxIndex = index;
      }
    }
  }
}
