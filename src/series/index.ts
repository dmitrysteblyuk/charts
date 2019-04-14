import {memoize} from '../lib/memoize';
import {getYDomain, XExtentCalculator} from '../chart/series-data';
import {ChartScale, getExtendedDomain} from '../chart/chart-scale';

export type AnySeries = Readonly<ReturnType<typeof createSeries>>;
export const enum SeriesType {
  Line,
  Bar,
  StackedBar,
  StackedLine,
  Percentage
};

export type DrawSeries = (
  context: CanvasRenderingContext2D,
  xArray: NumericData,
  yArrays: MultipleData,
  stacked: boolean,
  scaleX: (x: number) => number,
  scaleY: (y: number) => number,
  startIndex: number,
  endIndex: number,
  color: string,
  lineWidth: number,
  visibility: number,
  displayProgress: number,
  focused: number,
  centerX: number,
  centerY: number
) => void;

export function createSeries(
  xScale: ChartScale,
  yScale: ChartScale,
  xData: NumericData,
  yData: MultipleData,
  drawSeries: DrawSeries,
  stacked: boolean,
  percentage: boolean,
  bar: boolean,
  pie: boolean,
  color: string,
  label: string,
  strokeWidth: number,
  getXExtent: XExtentCalculator,
  zoomed: boolean
) {
  let displayed = true;
  let hidden = false;
  let pixelRatio = 1;
  let focused = false;
  const getSeriesYDomain = memoize(getYDomain, 1);

  function draw(
    context: CanvasRenderingContext2D,
    xArray: NumericData,
    yArrays: MultipleData,
    visibility: number,
    displayProgress: number,
    focusFactor: number,
    centerX: number,
    centerY: number
  ) {
    const [startIndex, endIndex] = getExtent();
    drawSeries(
      context,
      xArray,
      yArrays,
      stacked,
      xScale.getScale(),
      yScale.getScale(),
      startIndex,
      endIndex,
      color,
      pixelRatio * strokeWidth,
      visibility,
      displayProgress,
      focusFactor,
      centerX,
      centerY
    );
  }

  function getXDomain() {
    const x0 = xData[0];
    let x1 = xData[xData.length - 1];
    if (bar) {
      x1 += xData[1] - x0;
    }
    return [x0, x1];
  }

  function getExtendedXDomain(domain: NumberRange) {
    return getExtendedDomain(domain, getXDomain());
  }

  function getExtendedYDomain(domain: NumberRange) {
    let [min, max] = domain;
    if (stacked || bar) {
      min = Math.min(min, 0);
    }
    const [startIndex, endIndex] = getExtent();

    return getExtendedDomain(
      domain,
      getSeriesYDomain(getDisplayedYData()!, startIndex, endIndex, min, max)
    );
  }

  function getDisplayedYData(): NumericData | undefined {
    return yData[+stacked];
  }

  function getExtent() {
    const [x0, x1] = xScale.getDomain();
    return getXExtent(xData, x0, x1);
  }

  const instance = {
    draw,
    stacked,
    percentage,
    bar,
    pie,
    xScale,
    yScale,
    xData,
    getDisplayedYData,
    getFocused: () => focused,
    getStackIndex: () => +zoomed,
    getOwnYData: () => yData[0],
    getYData: () => yData,
    getXDomain,
    getExtendedXDomain,
    getExtendedYDomain,
    getColor: () => color,
    getLabel: () => label,
    isHidden: () => hidden,
    isDisplayed: () => displayed,
    isZoomed: () => zoomed,
    toDraw: () => displayed && !hidden,
    setFocused: (_: typeof focused) => (focused = _, instance),
    setYData: (_: typeof yData) => (yData = _, instance),
    setLabel: (_: typeof label) => (label = _, instance),
    setHidden: (_: typeof hidden) => (hidden = _, instance),
    setDisplay: (_: typeof displayed) => (displayed = _, instance),
    setPixelRatio: (_: typeof pixelRatio) => (pixelRatio = _, instance)
  };
  return instance;
}
