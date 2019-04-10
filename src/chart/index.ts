import {Axis, AxisPosition} from '../axis';
import {ChartScale, getExtendedDomain} from './chart-scale';
import {groupBy, getLinearScale} from '../lib/utils';
import {startAnimation, stopAnimation} from '../lib/animation';
import {AnySeries} from '../series';
import {createStateTransition} from '../lib/state-transition';
import {
  State,
  isStateEqual,
  shouldTransition,
  getIntermediateState,
  getFinalTransitionState
} from './chart-state';

export type Chart = Readonly<ReturnType<typeof createChart>>;

export function createChart(
  axes: Axis[],
  series: AnySeries[]
) {
  let pixelRatio = 1;
  let outerWidth = 0;
  let outerHeight = 0;
  let paddings: NumberRange;
  let innerWidth = 0;
  let innerHeight = 0;
  let context: CanvasRenderingContext2D;

  const stateTransition = createStateTransition(
    onStateUpdate,
    isStateEqual,
    shouldTransition,
    getIntermediateState,
    startAnimation,
    stopAnimation
  );

  function draw(_context: CanvasRenderingContext2D) {
    context = _context;

    setDomains(
      ({xScale}) => xScale,
      ({getExtendedXDomain}) => getExtendedXDomain
    );
    setDomains(
      ({yScale}) => yScale,
      ({getExtendedYDomain}) => getExtendedYDomain
    );
    setRanges();

    stateTransition(getFinalTransitionState(series));
  }

  function onStateUpdate({yDomains}: State) {
    context.clearRect(0, 0, outerWidth, outerHeight);
    context.translate(paddings[3], paddings[0]);

    series.forEach(({xScale, yScale}, index) => {
      xScale.setScale(getLinearScale(xScale.getDomain(), xScale.getRange()));
      yScale.setDomain(yDomains[index]);
      yScale.setScale(getLinearScale(yDomains[index], yScale.getRange()));
    });

    drawAxes();
    drawSeries();
    context.translate(-paddings[3], -paddings[0]);
  }

  function setDomains(
    getChartScale: (series: AnySeries) => ChartScale,
    getDomainExtender: (series: AnySeries) => (
      (domain: NumberRange) => NumberRange
    )
  ) {
    const groups = groupBy(
      series,
      (a, b) => getChartScale(a) === getChartScale(b)
    );
    const chartScales = groups.map((group) => getChartScale(group[0]));

    chartScales.forEach((scale, index) => {
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
        return getDomainExtender(item)(result);
      }, startDomain);

      if (domain[0] > domain[1]) {
        domain = currentDomain;
      }
      domain = getExtendedDomain(domain, scale.getMinDomain());

      if (!(domain[0] < domain[1])) {
        domain = [domain[0] - 1, domain[1] + 1];
      }
      scale.setDomain(domain);
    });
  }

  function setPixelRatio(_pixelRatio: number) {
    pixelRatio = _pixelRatio;
    series.forEach((item) => item.setPixelRatio(pixelRatio));
    axes.forEach((item) => item.setPixelRatio(pixelRatio));
  }

  function drawSeries() {
    series.forEach((item) => {
      if (item.isHidden()) {
        return;
      }
      item.draw(
        context,
        item.xData.x,
        item.yData.map(({y}) => y)
      );
    });
  }

  function drawAxes() {
    axes.forEach((axis) => {
      context.save();
      translateAxis(axis);

      axis.setGridSize(axis.isVertical() ? innerWidth : innerHeight)
        .draw(context);
      context.restore();
    });
  }

  function setRanges() {
    innerWidth = Math.max(
      1, outerWidth - paddings[1] - paddings[3]
    );
    innerHeight = Math.max(
      1, outerHeight - paddings[0] - paddings[2]
    );

    series.forEach(({xScale, yScale}) => {
      xScale.setRange([0, innerWidth]);
      yScale.setRange([innerHeight, 0]);
    });
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
    setOuterWidth: (_: typeof outerWidth) => (outerWidth = _, instance),
    setOuterHeight: (_: typeof outerHeight) => (outerHeight = _, instance),
    setPaddings: (_: typeof paddings) => (paddings = _, instance)
  };
  return instance;
}
