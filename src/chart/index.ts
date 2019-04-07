import {Axis, AxisPosition} from '../axis';
import {ChartScale, getExtendedDomain} from './chart-scale';
import {groupBy, isArrayEqual} from '../lib/utils';
import {BaseSeries} from '../series';
import {createStateTransition} from '../lib/state-transition';
import {
  State,
  isStateEqual,
  isTransitionStateEqual,
  getIntermediateState
} from './chart-state';

export type Chart = ReturnType<typeof createChart>;

export function createChart(
  axes: Axis[],
  series: BaseSeries[] = []
) {
  let pixelRatio = 1;
  let outerWidth = 0;
  let outerHeight = 0;
  let paddings: NumberRange = [0, 0, 0, 0];
  let innerWidth = 0;
  let innerHeight = 0;
  let context: CanvasRenderingContext2D;

  const stateTransition = createStateTransition(
    onStateUpdate,
    isStateEqual,
    isTransitionStateEqual,
    getIntermediateState
  );

  function draw(_context: CanvasRenderingContext2D) {
    context = _context;

    const {scales: xScales, domains: xDomains} = getDomains(
      ({xScale}) => xScale,
      ({extendXDomain}) => extendXDomain
    );
    setDomains(xScales, xDomains);

    const {scales: yScales, domains: yDomains} = getDomains(
      ({yScale}) => yScale,
      ({extendYDomain}) => extendYDomain
    );

    const {xRanges, yRanges} = setRanges(xScales, yScales);

    const seriesData = series.map(
      (item) => item.isHidden() ? null : item.getData()
    );

    stateTransition({
      yScales,
      yDomains,
      xDomains,
      yRanges,
      xRanges,
      seriesData
    });
  }

  function onStateUpdate({yScales, yDomains}: State) {
    setDomains(yScales, yDomains);

    context.clearRect(0, 0, outerWidth, outerHeight);
    context.translate(paddings[3], paddings[0]);
    drawAxes();
    drawSeries();
    context.translate(-paddings[3], -paddings[0]);
  }

  function setDomains(scales: ChartScale[], domains: NumberRange[]) {
    scales.forEach((scale, index) => scale.setDomain(domains[index]));
  }

  function getDomains(
    getScale: (series: BaseSeries) => ChartScale,
    getDomainExtender: (series: BaseSeries) => (
      (this: BaseSeries, domain: NumberRange) => NumberRange
    )
  ) {
    const groups = groupBy(
      series,
      (a, b) => getScale(a) === getScale(b)
    );
    const scales = groups.map((group) => getScale(group[0]));
    const domains = scales.map((scale, index) => {
      const currentDomain = scale.getDomain();
      if (scale.isFixed()) {
        return currentDomain;
      }
      const startDomain = (
        scale.isExtendableOnly()
          ? currentDomain
          : [Infinity, -Infinity]
      );
      let domain = groups[index].reduce((result, item) => {
        if (item.isHidden()) {
          return result;
        }
        return getDomainExtender(item).call(item, result);
      }, startDomain);

      if (domain[0] > domain[1]) {
        domain = currentDomain;
      }
      domain = getExtendedDomain(domain, scale.getMinDomain());

      if (!(domain[0] < domain[1])) {
        domain = [domain[0] - 1, domain[1] + 1];
      }

      if (isArrayEqual(domain, currentDomain)) {
        return currentDomain;
      }
      return domain;
    });

    return {scales, domains};
  }

  function setPixelRatio(_pixelRatio: number) {
    pixelRatio = _pixelRatio;
    series.forEach((item) => item.setPixelRatio(pixelRatio));
    axes.forEach((item) => item.setPixelRatio(pixelRatio));
  }

  function drawSeries() {
    series.forEach((item, _index) => {
      if (item.isHidden()) {
        return;
      }
      item.draw(context);
    });
  }

  function drawAxes() {
    axes.forEach((axis) => {
      context.save();
      translateAxis(axis);

      axis.setTickData(null)
        .setAnimated(false)
        .setHideOverlappingTicks(false)
        .setGridSize(axis.isVertical() ? innerWidth : innerHeight)
        .draw(context);
      context.restore();
    });
  }

  function setRanges(xScales: ChartScale[], yScales: ChartScale[]) {
    innerWidth = Math.max(
      1, outerWidth - paddings[1] - paddings[3]
    );
    innerHeight = Math.max(
      1, outerHeight - paddings[0] - paddings[2]
    );

    const xRanges = xScales.map((scale) => {
      scale.setRange([0, innerWidth]);
      return scale.getRange();
    });
    const yRanges = yScales.map((scale) => {
      scale.setRange([innerHeight, 0]);
      return scale.getRange();
    });

    return {xRanges, yRanges};
  }

  function translateAxis(axis: Axis) {
    const position = axis.getPosition();
    if (position === AxisPosition.right) {
      context.translate(innerWidth, 0);
    } else if (position === AxisPosition.bottom) {
      context.translate(0, innerHeight);
    }
  }

  const instance = {
    axes,
    series,
    draw,
    setPixelRatio,
    // tslint:disable max-line-length
    setOuterWidth: (_: typeof outerWidth) => (outerWidth = _, instance),
    setOuterHeight: (_: typeof outerHeight) => (outerHeight = _, instance),
    setPaddings: (_: typeof paddings) => (paddings = _, instance)
    // tslint:enable max-line-length
  };
  return instance;
}
