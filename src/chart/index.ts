import {Axis, AxisPosition} from '../axis';
import {ChartScale} from './chart-scale';
import {memoize} from '../lib/memoize';
import {groupBy} from '../lib/utils';
import {startAnimation, stopAnimation} from '../lib/animation';
import {AnySeries} from '../series';
import {createStateTransition} from '../lib/state-transition';
import {
  State,
  isStateEqual,
  getTransitionTriggers,
  getIntermediateStateFactory,
  getFinalTransitionState
} from './chart-state';
import {
  calculateXExtent,
  StackedDataCalculator,
  PercentageDataCalculator,
  XExtentCalculator
} from './series-data';

export type Chart = Readonly<ReturnType<typeof createChart>>;

export function createChart(
  axes: Axis[],
  getStackedData: StackedDataCalculator,
  getPercentageData: PercentageDataCalculator,
  setSeriesYData: (series: AnySeries[], getXExtent: XExtentCalculator) => void
) {
  let series: AnySeries[] = [];
  let pixelRatio = 1;
  let outerWidth = 0;
  let outerHeight = 0;
  let paddings: NumberRange;
  let innerWidth = 0;
  let innerHeight = 0;
  let context: CanvasRenderingContext2D;
  let axesHidden = false;

  const getXExtent = memoize(calculateXExtent, 1);
  const stateTransition = createStateTransition(
    onStateUpdate,
    isStateEqual,
    getTransitionTriggers,
    getIntermediateStateFactory(
      getStackedData,
      getPercentageData,
      getXExtent
    ),
    startAnimation,
    stopAnimation
  );

  function draw(_context: CanvasRenderingContext2D) {
    context = _context;
    setSeriesYData(series, getXExtent);
    setYDomains();
    setRanges();
    redraw();
  }

  function redraw() {
    stateTransition(getFinalTransitionState(series));
  }

  function setYDomains() {
    setDomains(
      ({yScale}) => yScale,
      ({getExtendedYDomain}) => getExtendedYDomain
    );
  }

  function setXDomains() {
    setDomains(
      ({xScale}) => xScale,
      ({getExtendedXDomain}) => getExtendedXDomain
    );
  }

  function onStateUpdate({
    yDomains,
    xDomains,
    yData,
    visibilities,
    displayed,
    byYScale,
    byXScale,
    focusFactors
  }: State) {
    context.clearRect(0, 0, outerWidth, outerHeight);
    context.translate(paddings[3], paddings[0]);

    byYScale.forEach(({key}, index) => {
      key.setDomain(yDomains[index]);
    });

    byXScale.forEach(({key}, index) => {
      key.setDomain(xDomains[index]);
    });

    if (!axesHidden) {
      drawAxes();
    }
    drawSeries(yData, visibilities, displayed, focusFactors);
    context.translate(-paddings[3], -paddings[0]);
  }

  function setDomains(
    getChartScale: (series: AnySeries) => ChartScale,
    getDomainExtender: (series: AnySeries) => (
      (domain: NumberRange) => NumberRange
    )
  ) {
    const filtered = series.filter(({toDraw}) => toDraw()).reverse();

    groupBy(filtered, getChartScale).forEach(({key: scale, items}) => {
      if (scale.isFixed()) {
        return;
      }
      const oneItem = (
        items[0].xScale === scale
          ? items[0]
          : items.find(({stacked}) => stacked)
      );
      if (oneItem && oneItem.xScale !== scale) {
        items = [oneItem];
      }

      const domain = items.reduce<NumberRange>((result, item) => {
        return getDomainExtender(item)(result);
      }, [Infinity, -Infinity]);

      if (domain[0] < domain[1]) {
        scale.setDomain(domain);
      }
    });
  }

  function drawSeries(
    yData: MultipleData[],
    visibilities: number[],
    displayed: number[],
    focusFactors: number[]
  ) {
    series.forEach((item, index) => {
      if (!visibilities[index] || !displayed[index]) {
        return;
      }
      item.setPixelRatio(pixelRatio).draw(
        context,
        item.xData,
        yData[index],
        visibilities[index],
        displayed[index],
        focusFactors[index],
        innerWidth / 2,
        innerHeight / 2
      );
    });
    context.globalAlpha = 1;
  }

  function drawAxes() {
    axes.forEach((axis) => {
      const translate = getAxisTranslate(axis);
      if (translate) {
        context.translate(...translate[0]);
      }
      axis.setPixelRatio(pixelRatio)
        .setGridSize(axis.isVertical() ? innerWidth : innerHeight)
        .draw(context);
      if (translate) {
        context.translate(...translate[1]);
      }
      context.globalAlpha = 1;
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
      xScale.setRange([-paddings[3], innerWidth + paddings[1]]);
      yScale.setRange([innerHeight, 0]);
    });
  }

  function getAxisTranslate(
    axis: Axis
  ): [[number, number], [number, number]] | undefined {
    const position = axis.getPosition();
    if (position === AxisPosition.right) {
      return [[innerWidth, 0], [-innerWidth, 0]];
    }
    if (position === AxisPosition.bottom) {
      return [[0, innerHeight], [0, -innerHeight]];
    }
  }

  const instance = {
    axes,
    draw,
    redraw,
    getXExtent,
    setXDomains,
    setAxesHidden: (_: typeof axesHidden) => (axesHidden = _),
    getSeries: () => series,
    setSeries: (_: typeof series) => (series = _),
    setOuterWidth: (_: typeof outerWidth) => (outerWidth = _, instance),
    setOuterHeight: (_: typeof outerHeight) => (outerHeight = _, instance),
    setPaddings: (_: typeof paddings) => (paddings = _, instance),
    setPixelRatio: (_: typeof pixelRatio) => (pixelRatio = _, instance)
  };
  return instance;
}
