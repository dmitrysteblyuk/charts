import {groupBy} from '../lib/utils';
import {binarySearch} from '../lib/binary-search';
import {AnySeries} from '../series';

export function getSeriesData(
  allSeries: AnySeries[],
  visibilities: number[],
  displayFactors: number[],
  getStackedData: StackedDataCalculator,
  getPercentageData: PercentageDataCalculator,
  getXExtent: XExtentCalculator,
  xDomains: NumberRange[],
  progress: number
): MultipleData[] {
  const currentData = allSeries.map((series) => series.getYData());

  const [stackToCalculate, pieToCalculate] = allSeries.reduce((
    result,
    series,
    index
  ) => {
    if (visibilities[index]) {
      if (series.stacked) {
        result[0].push(index);
      }
      if (series.pie) {
        result[1].push(index);
      }
    }
    return result;
  }, [[], []] as [number[], number[]]);

  groupBy(pieToCalculate, getGroupKey).forEach(({items: indices}) => {
    let pieSum = 0;

    const pieAverages = indices.map((index) => {
      const averages = xDomains.map(([d0, d1]) => {
        const [startIndex, endIndex] = (
          getXExtent(allSeries[index].xData, d0, d1)
        );
        const count = endIndex - startIndex;
        return count && (
          calculateSum(currentData[index][0], startIndex, endIndex) / count
        );
      });

      const avg = (
        averages.length > 1
          ? averages[1] + (averages[0] - averages[1]) * progress
          : averages[0]
      );
      const visibility = visibilities[index];
      const result = avg * visibility;

      pieSum += (
        indices.length < 2 || displayFactors[index] < 1
          ? avg
          : result
      );

      return result
    });

    const piePercentages = pieAverages.map((avg) => avg / pieSum);

    const pieAngles = piePercentages.reduce((result, percentage, index) => {
      result.push((index && result[index - 1]) + percentage * 2 * Math.PI);
      return result;
    }, [] as number[]);

    indices.forEach((seriesIndex, index) => {
      const yData = currentData[seriesIndex];
      currentData[seriesIndex] = [
        yData[0],
        [
          pieAngles[index],
          index && pieAngles[index - 1],
          yData[1] && progress < 1 ? yData[1][2] : pieAverages[index],
          yData[1] && progress < 1 ? yData[1][3] : piePercentages[index]
        ]
      ];
    });
  });

  groupBy(stackToCalculate, getGroupKey).forEach(({items: indices}) => {
    let previousData: MultipleData | undefined;

    const nextData = indices.map((index) => {
      let yData = currentData[index][0];
      const percent = visibilities[index];
      if (percent < 1) {
        yData = yData.map((y) => y * percent);
      }
      return previousData = (
        previousData
          ? [
            yData,
            getStackedData(yData, previousData[1]),
            previousData[1]
          ]
          : [yData, yData]
      );
    });

    if (allSeries[indices[0]].percentage) {
      const percentageData = getPercentageData(
        ...nextData.map((data) => data[1])
      );
      nextData.forEach((data, index) => {
        data[1] = percentageData[index];
        data[2] = percentageData[index - 1];
      });
    }

    indices.forEach((seriesIndex, index) => {
      currentData[seriesIndex] = nextData[index];
    });
  });

  return currentData;

  function getGroupKey(index: number) {
    return allSeries[index].getStackIndex();
  }
}

export type XExtentCalculator = typeof calculateXExtent;
export type StackedDataCalculator = typeof calculateStackedData;
export type PercentageDataCalculator = typeof calculatePercentageData;

export function calculateXExtent(
  xData: NumericData,
  x0: number,
  x1: number
): NumberRange {
  // console.log('extent', [xData[0], xData[1], xData[2]], x0, x1);
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

export function calculateSum(
  data: NumericData,
  startIndex: number,
  endIndex: number
): number {
  let sum = 0;
  for (let index = startIndex; index < endIndex; index++) {
    sum += data[index];
  }
  return sum;
}
