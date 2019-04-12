import {binarySearch} from '../lib/binary-search';

export function getXExtent(
  xData: NumericData,
  x0: number,
  x1: number
): NumberRange {
  const startIndex = Math.max(
    0,
    binarySearch(0, xData.length, (index) => x0 < xData[index]) - 1
  );
  const endIndex = Math.min(
    xData.length,
    binarySearch(startIndex, xData.length, (index) => x1 <= xData[index]) + 1
  );
  return [startIndex, endIndex];
}

export function getYDomain(
  yData: NumericData,
  startIndex: number,
  endIndex: number,
  initialMin: number,
  initialMax: number
): NumberRange {
  let min = initialMin;
  let max = initialMax;

  for (let index = startIndex; index < endIndex; index++) {
    const value = yData[index];
    if (min > value) {
      min = value;
    } else if (max < value) {
      max = value;
    }
  }
  return [min, max];
}

export function calculateStackedData(
  a: NumericData,
  b: NumericData
): NumericData {
  // console.log('stack', [a[0], a[1], a[2]], [b[0], b[1], b[2]]);
  const sum = new Array(a.length);

  for (let index = 0; index < a.length; index++) {
    sum[index] = a[index] + b[index];
  }
  return sum;
}

export function calculatePercentageData(
  ...stackedData: NumericData[]
): NumericData[] {
  // console.log('percentage', stackedData);
  const sum = stackedData.pop()!;
  return stackedData.map((data) => {
    return data.map((value, index) => sum[index] && (value / sum[index]));
  });
}
