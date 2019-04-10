import {memoize} from './memoize';
import {binarySearch} from './binary-search';

export type SeriesXData = Readonly<ReturnType<typeof createSeriesXData>>;
export type SeriesYData = Readonly<ReturnType<typeof createSeriesYData>>;

export function createSeriesXData(x: NumericData) {
  const size = x.length;

  const getExtent = memoize((x0: number, x1: number): NumberRange => {
    const startIndex = Math.max(
      0,
      binarySearch(0, size, (index) => x0 < x[index]) - 1
    );
    const endIndex = Math.min(
      size,
      binarySearch(startIndex, size, (index) => x1 <= x[index]) + 1
    );
    return [startIndex, endIndex];
  }, 1);

  function getDomain(): NumberRange {
    return [x[0], x[size - 1]];
  }

  return {x, size, getExtent, getDomain};
}

export function createSeriesYData(y: NumericData) {
  const size = y.length;

  const getDomain = memoize((
    startIndex: number,
    endIndex: number,
    initialMin: number,
    initialMax: number
  ): NumberRange => {
    let min = initialMin;
    let max = initialMax;

    for (let index = startIndex; index < endIndex; index++) {
      if (min > y[index]) {
        min = y[index];
      } else if (max < y[index]) {
        max = y[index];
      }
    }
    return [min, max];
  }, 1);

  return {y, size, getDomain};
}

export function getStackedSeriesData(...y: NumericData[]): NumericData[] {
  let lastY = y[0];
  const result = [lastY];
  for (let yIndex = 1; yIndex < y.length; yIndex++) {
    const sumY = new (
      y[yIndex].constructor as new (count: number) => number[]
    )(y[yIndex].length);

    for (let index = 0; index < y[yIndex].length; index++) {
      sumY[index] = lastY[index] + y[yIndex][index];
    }
    result.push(lastY = sumY);
  }
  return result;
}
