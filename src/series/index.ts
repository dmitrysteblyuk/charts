import {SeriesXData, SeriesYData} from '../lib/series-data';
import {ChartScale, getExtendedDomain} from '../chart/chart-scale';

export type AnySeries = Readonly<ReturnType<typeof createSeries>>;
export const enum SeriesType {
  Line,
  Bar,
  StackedBar,
  StackedLine,
  Percentage
};

export function isStacked(type: SeriesType) {
  return type >= SeriesType.StackedBar;
}

export function createSeries(
  xScale: ChartScale,
  yScale: ChartScale,
  xData: SeriesXData,
  yData: SeriesYData[],
  drawSeries: (
    context: CanvasRenderingContext2D,
    xArray: NumericData,
    yArrays: NumericData[],
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

  function draw(
    context: CanvasRenderingContext2D,
    xArray: NumericData,
    yArrays: NumericData[]
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
    let [x0, x1] = xData.getDomain();
    if (
      type === SeriesType.Bar ||
      type === SeriesType.StackedBar
    ) {
      x1 += xData.x[1] - x0;
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
      yData[0].getDomain(startIndex, endIndex, min, max)
    );
  }

  function getExtent() {
    const [x0, x1] = xScale.getDomain();
    return xData.getExtent(x0, x1);
  }

  const instance = {
    draw,
    type,
    xScale,
    yScale,
    xData,
    yData,
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
