import {createChart} from '../chart';
import {createAxis, AxisPosition} from '../axis';
import {createBrush} from '../brush';
import {Selection} from '../lib/selection';
import {createChartScale, getExtendedDomain} from '../chart/chart-scale';
import {getDecimalScaleTicks} from '../lib/decimal-scale-ticks';
import {getTimeScaleTicks} from '../lib/time-scale-ticks';
import {AnySeries} from '../series';
import {createLegend} from '../legend';
import {onZoomEvents, ZoomMode, ZoomPositions} from '../lib/zoom';
import {roundRange} from '../lib/utils';
import {memoize} from '../lib/memoize';
import {getZoomFactorAndOffset} from './zoom-transform';
import {axisTimeFormat} from '../lib/time-format';
import {createTooltip} from '../tooltip';
import {getNearestPoint} from './get-nearest-point';
import {roundAuto} from '../lib/decimal-scale-ticks';
import {getStackedSeriesData} from '../lib/series-data';
import './index.css';

export type TimeChart = Readonly<ReturnType<typeof createTimeChart>>;

export function createTimeChart() {
  let outerWidth = 0;
  let helperHeight = 65;
  let innerWidth = 0;
  let mainInnerHeight = 0;
  let helperInnerHeight = 0;
  let mainHeight = 0;
  let pixelRatio = 1;

  const timeScale = createChartScale();
  const fullTimeScale = createChartScale();
  const valueScale = createChartScale();
  const fullValueScale = createChartScale();
  const brush = createBrush();
  const legend = createLegend([]);
  const tooltip = createTooltip();
  const paddings = [20, 10, 30, 10];
  const helperPaddings = [0, 0, 10, 0];
  const helperChart = createChart([], []);
  const mainChart = createChart(
    [
      createAxis(
        AxisPosition.bottom,
        timeScale,
        memoize(getTimeScaleTicks, 1),
        axisTimeFormat,
        true
      ),
      createAxis(
        AxisPosition.left,
        valueScale,
        memoize(getDecimalScaleTicks, 1),
        roundAuto,
        false,
        true
      )
    ],
    []
  );

  let isBrushing = false;
  let brushLeft = 0;
  let brushRight = 0;
  let container: Selection<HTMLDivElement>;

  function render(_container: Selection<HTMLDivElement>) {
    container = _container;
    innerWidth = outerWidth - paddings[1] - paddings[3];
    mainInnerHeight = mainHeight - paddings[0] - paddings[2];
    helperInnerHeight = helperHeight - helperPaddings[0] - helperPaddings[2];

    container.setAttrs({
      'class': 'chart-container',
      style: `width: ${outerWidth}px`
    });

    const svgContainer = (
      container.renderOne<SVGElement>('svg', 'svg')
    ).setAttrs({
      width: outerWidth,
      height: mainHeight + helperHeight,
    });

    renderMain();

    fullTimeScale.setMinDomain(timeScale.getDomain());
    renderHelper();
    const svgSelection = svgContainer.renderOne<SVGGElement>(
      'g',
      0,
      (selection) => selection.setAttrs({
        transform: `translate(${paddings[3]},${paddings[0]})`
      })
    );

    renderBrush(svgSelection);

    const mainInnerContainer = container.renderOne<HTMLDivElement>(
      'div',
      'rect',
      (selection) => bindZoomEvens(
        selection.setAttrs({'class': 'main-inner-container'})
      )
    );

    mainInnerContainer.setStyles({
      width: `${outerWidth}px`,
      height: `${mainInnerHeight}px`
    });

    renderTooltip(mainInnerContainer, svgSelection);
    renderLegend();
  }

  function renderMain() {
    const mainCanvas = container.renderOne<HTMLCanvasElement>(
      'canvas',
      'main'
    );
    setCanvasSize(mainCanvas, outerWidth, mainHeight);

    const context = mainCanvas.getContext();
    if (!context) {
      return;
    }

    mainChart
      .setOuterWidth(toCanvasSize(outerWidth))
      .setOuterHeight(toCanvasSize(mainHeight))
      .setPaddings(paddings.map(toCanvasSize))
      .draw(context);
  }

  function renderHelper() {
    const helperCanvas = container.renderOne<HTMLCanvasElement>(
      'canvas',
      'helper',
      (selection) => selection.setStyles({
        'marginLeft': `${paddings[3]}px`
      })
    );

    const context = helperCanvas.getContext();
    if (!context) {
      return;
    }

    const helperWidth = outerWidth - paddings[3] - paddings[1];
    setCanvasSize(helperCanvas, helperWidth, helperHeight);
    helperChart
      .setOuterWidth(toCanvasSize(helperWidth))
      .setOuterHeight(toCanvasSize(helperHeight))
      .setPaddings(helperPaddings.map(toCanvasSize))
      .draw(context);
  }

  function setCanvasSize(
    canvas: Selection<HTMLCanvasElement>,
    width: number,
    height: number
  ) {
    canvas.setAttrs({
      'class': 'chart-canvas',
      width: toCanvasSize(width),
      height: toCanvasSize(height)
    }).setStyles({
      width: `${width}px`,
      height: `${height}px`
    });
  }

  function toCanvasSize(size: number) {
    return Math.round(size * pixelRatio);
  }

  function addSeries(mainSeries: AnySeries, helperSeries: AnySeries) {
    mainChart.series.push(mainSeries);
    helperChart.series.push(helperSeries);
    legend.seriesGroups.push([mainSeries, helperSeries]);
  }

  function getPointX(clientX: number, innerContainer: Selection) {
    return Math.round(
      (clientX - paddings[3] - innerContainer.getRect()!.left) *
      pixelRatio
    );
  }

  function renderLegend() {
    const legendContainer = container.renderOne(
      'div',
      'legend',
      (selection) => {
        selection.setAttrs({'class': 'legend-container'});
        legend.clickEvent.on((group) => {
          const hidden = !group[0].isHidden();
          group.forEach((series) => series.setHidden(hidden));
          render(container);
        });
      }
    );
    legend.render(legendContainer);
  }

  function renderTooltip(
    mainInnerContainer: Selection<HTMLDivElement>,
    svgSelection: Selection<SVGGElement>
  ) {
    const lineContainer = svgSelection.renderOne('g', 'line');
    mainInnerContainer.renderOne<HTMLDivElement>(
      'div',
      'tooltip',
      (selection) => {
        bindTooltipEvents(mainInnerContainer, selection, lineContainer);
      }
    );
  }

  function bindTooltipEvents(
    mainInnerContainer: Selection<HTMLDivElement>,
    tooltipContainer: Selection<HTMLDivElement>,
    lineContainer: Selection
  ) {
    mainInnerContainer.on('mousemove', ({clientX}: MouseEvent) => {
      const pointX = getPointX(clientX, mainInnerContainer);
      interface Point {
        distance: number;
        index: number;
        series: AnySeries;
      }
      let firstPoint: Point | undefined;

      const results = mainChart.series.reduce((points, series) => {
        const nearest = !series.isHidden() && getNearestPoint(
          pointX,
          series.xData,
          series.xScale,
          20
        );
        const point = nearest && {series, ...nearest};

        if (!point || firstPoint && point.distance > firstPoint.distance) {
          return points.concat(null);
        }

        firstPoint = point;
        return points.concat(point);
      }, [] as (Point | null)[]);

      if (!firstPoint) {
        hideTooltip();
        return;
      }

      const {series: firstSeries, index: firstIndex} = firstPoint;
      const time = firstSeries.xData.x[firstIndex];
      const lineX = firstSeries.xScale.getScale()(time) / pixelRatio;
      const left = Math.round(lineX + paddings[3]) - 20;
      const values = results.map((item) => {
        return item ? item.series.yData[0].y[item.index] : 0;
      });

      tooltip
        .setTime(time)
        .setLeft(left)
        .setHidden(false)
        .setSeries(results.map((item) => item && item.series))
        .setValues(values)
        .setLineX(lineX)
        .setLineY2(mainInnerHeight)
        .setPixelRatio(pixelRatio)
        .render(tooltipContainer, lineContainer);
    }).on(
      'mouseleave', hideTooltip
    );

    function hideTooltip() {
      tooltip.setHidden(true).render(tooltipContainer, lineContainer);
    }
  }

  function bindZoomEvens(mainInnerContainer: Selection<HTMLDivElement>) {
    let startWidth: number;
    let startDomain: NumberRange;
    let startPositions: ZoomPositions;
    let hasChanged: boolean;

    onZoomEvents(mainInnerContainer, (positions, mode, event) => {
      event.preventDefault();
      if (!hasChanged) {
        hasChanged = true;
      }
      const [factor, offset] = getZoomFactorAndOffset(
        startPositions,
        positions,
        mode,
        startDomain,
        startWidth,
        (clientX) => (
          timeScale.getInvertedScale()(getPointX(clientX, mainInnerContainer))
        )
      );
      zoomMainChart(startDomain, factor, offset);
    }, (positions) => {
      startDomain = timeScale.getDomain();
      startPositions = positions;
      startWidth = innerWidth;
    }, (mode) => {
      if (!hasChanged) {
        return;
      }
      hasChanged = false;
      if (mode === ZoomMode.Wheel) {
        return;
      }
    });
  }

  function zoomMainChart(
    [startTime, endTime]: NumberRange,
    factor: number,
    offset: number
  ) {
    if (factor === 1 && offset === 0) {
      return;
    }
    const nextStartTime = factor * startTime + offset;
    const nextEndTime = factor * endTime + offset;

    timeScale.setFixed(true);
    timeScale.setDomain([nextStartTime, nextEndTime]);

    const currentFullDomain = fullTimeScale.getDomain();
    const extendedFullDomain = getExtendedDomain(
      currentFullDomain,
      [nextStartTime, nextEndTime]
    );

    if (extendedFullDomain !== currentFullDomain) {
      fullTimeScale.setExtendableOnly(true);
      fullTimeScale.setDomain(extendedFullDomain);
    }
    render(container);
  }

  function renderBrush(svgSelection: Selection<SVGGElement>) {
    const brushContainer = svgSelection.renderOne(
      'g',
      'brush',
      bindBrushEvents
    ).setAttrs({
      'transform': `translate(0,${mainHeight - paddings[0]})`
    });

    const {width, left, right} = (
      isBrushing && brush.getWidth() === innerWidth
        ? {width: innerWidth, left: brushLeft, right: brushRight}
        : getBrushExtentFromTimeScale()
    );

    brush.setHeight(helperInnerHeight)
      .setWidth(width)
      .setLeft(left)
      .setRight(right)
      .render(brushContainer);
  }

  function bindBrushEvents() {
    brush.activeEvent.on((isActive) => {
      isBrushing = isActive;
      if (isActive) {
        return;
      }
      render(container);
    });

    brush.changeEvent.on((next) => {
      brushLeft = next.left;
      brushRight = next.right;

      const reset = brush.isReset();
      timeScale.setFixed(!reset);

      if (reset) {
        fullTimeScale.setExtendableOnly(false);
      } else {
        setBrushExtentToTimeScale(next.left, next.right);
      }

      render(container);
    });
  }

  function setBrushExtentToTimeScale(left: number, right: number) {
    if (!(left < right)) {
      return;
    }
    const [minTime, maxTime] = fullTimeScale.getDomain();
    const dateSpan = maxTime - minTime;

    const startTime = minTime + dateSpan * left / innerWidth;
    const endTime = minTime + dateSpan * right / innerWidth;

    timeScale.setDomain([startTime, endTime]);
  }

  function getBrushExtentFromTimeScale() {
    if (!timeScale.isFixed()) {
      return {width: innerWidth, left: 0, right: innerWidth};
    }

    const [startTime, endTime] = timeScale.getDomain();
    const [minTime, maxTime] = fullTimeScale.getDomain();
    const dateSpan = maxTime - minTime;

    let [left, right] = roundRange(
      (startTime - minTime) / dateSpan * innerWidth,
      (endTime - minTime) / dateSpan * innerWidth
    );
    left = Math.max(0, Math.min(left, innerWidth));
    right = Math.max(left, Math.min(right, innerWidth));

    return {width: innerWidth, left, right};
  }

  const instance = {
    getStackedSeriesData: memoize(getStackedSeriesData, 10),
    render,
    addSeries,
    mainChart,
    helperChart,
    setPixelRatio,
    timeScale,
    fullTimeScale,
    valueScale,
    fullValueScale,
    setOuterWidth: (_: typeof outerWidth) => (outerWidth = _, instance),
    setHelperHeight: (_: typeof helperHeight) => (helperHeight = _, instance),
    setMainHeight: (_: typeof mainHeight) => (mainHeight = _, instance)
  };

  function setPixelRatio(_pixelRatio: number) {
    pixelRatio = _pixelRatio;
    mainChart.setPixelRatio(pixelRatio);
    helperChart.setPixelRatio(pixelRatio);
    return instance;
  }

  return instance;
}
