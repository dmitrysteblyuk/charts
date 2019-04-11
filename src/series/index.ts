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
    lineWidth: number
  ) => void,
  type: SeriesType
) {
  let color = '';
  let label = '';
  let hidden = false;
  let pixelRatio = 1;
  let strokeWidth = 2;
  const stacked = type >= SeriesType.StackedBar;
  const getSeriesYDomain = memoize(getYDomain, 1);
  const getSeriesXExtent = memoize(getXExtent, 1);

  function draw(
    context: CanvasRenderingContext2D,
    xArray: NumericData,
    yArrays: MultipleData
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
      pixelRatio * strokeWidth
    );
  }

  function getExtendedXDomain(domain: NumberRange) {
    const x0 = xData[0];
    let x1 = xData[xData.length - 1];
    if (
      type === SeriesType.Bar ||
      type === SeriesType.StackedBar
    ) {
      x1 += xData[1] - x0;
    }
    return getExtendedDomain(domain, [x0, x1]);
  }

  function getExtendedYDomain(domain: NumberRange) {
    let [min, max] = domain;
    if (type >= SeriesType.Bar) {
      min = Math.min(min, 0);
    }
    const [startIndex, endIndex] = getExtent();

    return getExtendedDomain(
      domain,
      getSeriesYDomain(getMainYData(), startIndex, endIndex, min, max)
    );
  }

  function getMainYData() {
    return yData[+stacked];
  }

  function getExtent() {
    const [x0, x1] = xScale.getDomain();
    return getSeriesXExtent(xData, x0, x1);
  }

  const instance = {
    draw,
    stacked,
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
    setColor: (_: typeof color) => (color = _, instance),
    setLabel: (_: typeof label) => (label = _, instance),
    setHidden: (_: typeof hidden) => (hidden = _, instance),
    setPixelRatio: (_: typeof pixelRatio) => (pixelRatio = _, instance),
    setStrokeWidth: (_: typeof strokeWidth) => (strokeWidth = _, instance)
  };
  return instance;
}

export function getSeriesData(
  allSeries: AnySeries[],
  getStackedData: (a: NumericData, b: NumericData) => NumericData,
  getOwnYData: (series: AnySeries, index: number) => NumericData | null
): MultipleData[] {
  let previousData: MultipleData | undefined;
  return allSeries.map((series, index) => {
    const yData = series.stacked && getOwnYData(series, index);
    if (!yData) {
      return series.getYData();
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
}
