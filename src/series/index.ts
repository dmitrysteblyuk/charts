import {memoize} from '../lib/memoize';
import {getXExtent, getYDomain} from './data';
import {ChartScale, getExtendedDomain} from '../chart/chart-scale';

export type AnySeries = Readonly<ReturnType<typeof createSeries>>;
export const enum SeriesType {
  Line,
  Bar,
  StackedBar,
  StackedLine,
  Percentage
};

export function createSeries(
  xScale: ChartScale,
  yScale: ChartScale,
  xData: NumericData,
  yData: MultipleData,
  drawSeries: (
    context: CanvasRenderingContext2D,
    xArray: NumericData,
    yArrays: MultipleData,
    scaleX: (x: number) => number,
    scaleY: (y: number) => number,
    startIndex: number,
    endIndex: number,
    color: string,
    lineWidth: number,
    visibility: number
  ) => void,
  stacked: boolean,
  percentage: boolean,
  bar: boolean
) {
  let displayed = true;
  let color = '';
  let label = '';
  let hidden = false;
  let pixelRatio = 1;
  let strokeWidth = 2;
  const getSeriesYDomain = memoize(getYDomain, 1);
  const getSeriesXExtent = memoize(getXExtent, 1);

  function draw(
    context: CanvasRenderingContext2D,
    xArray: NumericData,
    yArrays: MultipleData,
    visibility: number
  ) {
    const [startIndex, endIndex] = getExtent();
    drawSeries(
      context,
      xArray,
      yArrays,
      xScale.getScale(),
      yScale.getScale(),
      startIndex,
      endIndex,
      color,
      pixelRatio * strokeWidth,
      visibility
    );
  }

  function getExtendedXDomain(domain: NumberRange) {
    const x0 = xData[0];
    let x1 = xData[xData.length - 1];
    if (bar) {
      x1 += xData[1] - x0;
    }
    return getExtendedDomain(domain, [x0, x1]);
  }

  function getExtendedYDomain(domain: NumberRange) {
    let [min, max] = domain;
    if (stacked || bar) {
      min = Math.min(min, 0);
    }
    const [startIndex, endIndex] = getExtent();

    return getExtendedDomain(
      domain,
      getSeriesYDomain(getMainYData()!, startIndex, endIndex, min, max)
    );
  }

  function getMainYData(): NumericData | undefined {
    return yData[+stacked];
  }

  function getExtent() {
    const [x0, x1] = xScale.getDomain();
    return getSeriesXExtent(xData, x0, x1);
  }

  const instance = {
    draw,
    stacked,
    percentage,
    bar,
    xScale,
    yScale,
    xData,
    getMainYData,
    getOwnYData: () => yData[0],
    getYData: () => yData,
    setYData: (_: typeof yData) => (yData = _),
    getExtendedXDomain,
    getExtendedYDomain,
    getColor: () => color,
    getLabel: () => label,
    isHidden: () => hidden,
    isDisplayed: () => displayed,
    toDraw: () => displayed && !hidden,
    setColor: (_: typeof color) => (color = _, instance),
    setLabel: (_: typeof label) => (label = _, instance),
    setHidden: (_: typeof hidden) => (hidden = _, instance),
    setDisplay: (_: typeof displayed) => (displayed = _, instance),
    setPixelRatio: (_: typeof pixelRatio) => (pixelRatio = _, instance),
    setStrokeWidth: (_: typeof strokeWidth) => (strokeWidth = _, instance)
  };
  return instance;
}

export function getSeriesData(
  allSeries: AnySeries[],
  getStackedData: (a: NumericData, b: NumericData) => NumericData,
  getPercentageData: (...stackedData: NumericData[]) => NumericData[],
  getOwnYData: (series: AnySeries, index: number) => NumericData | null
): MultipleData[] {
  const currentData = allSeries.map((series) => series.getYData());
  const toCalculate = allSeries.reduce<number[]>((indices, series, index) => {
    if (series.stacked && getOwnYData(series, index)) {
      indices.push(index);
    }
    return indices;
  }, []);

  if (!toCalculate.length) {
    return currentData;
  }

  let previousData: MultipleData | undefined;
  const nextData = toCalculate.map((index) => {
    const yData = getOwnYData(allSeries[index], index)!;
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

  if (allSeries[toCalculate[0]].percentage) {
    const percentageData = getPercentageData(
      ...nextData.map((data) => data[1])
    );
    nextData.forEach((data, index) => {
      data[1] = percentageData[index];
      data[2] = percentageData[index - 1];
    });
  }

  toCalculate.forEach((seriesIndex, index) => {
    currentData[seriesIndex] = nextData[index];
  });

  return currentData;
}
