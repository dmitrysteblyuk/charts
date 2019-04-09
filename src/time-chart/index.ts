import {createChart} from '../chart';
import {createAxis, AxisPosition} from '../axis';
import {createBrush} from '../brush';
import {Selection} from '../lib/selection';
import {
  createValueScale,
  createTimeScale,
  getExtendedDomain
} from '../chart/chart-scale';
import {BaseSeries} from '../series';
import {createLineSeries, LineSeries} from '../series/line-series';
import {createLegend} from '../legend';
import {SeriesData} from '../lib/series-data';
import {onZoomEvents, ZoomMode, ZoomPositions} from '../lib/zoom';
import {roundRange} from '../lib/utils';
import {getZoomFactorAndOffset} from './zoom-transform';
import {axisTimeFormat} from '../lib/time-format';
import {createTooltip} from '../tooltip';
import {getNearestPoint} from './get-nearest-point';
import {roundAuto} from '../lib/decimal-scale-ticks';
import './index.css';

export type TimeChart = ReturnType<typeof createTimeChart>;

export function createTimeChart() {
  let outerWidth = 0;
  let helperHeight = 65;
  let innerWidth = 0;
  let mainInnerHeight = 0;
  let helperInnerHeight = 0;
  let mainHeight = 0;
  let pixelRatio = 1;

  const timeScale = createTimeScale();
  const fullTimeScale = createTimeScale();
  const valueScale = createValueScale();
  const fullValueScale = createValueScale();
  const brush = createBrush();
  const legend = createLegend([]);
  const tooltip = createTooltip();
  const paddings = [0, 20, 30, 20];
  const helperPaddings = [0, 20, 10, 20];
  const helperChart = createChart([]);
  const mainChart = createChart(
    [
      createAxis(AxisPosition.bottom, timeScale)
        .setTickFormat(axisTimeFormat)
        .setDisplayGrid(false),
      createAxis(AxisPosition.left, valueScale)
        .setTickFormat(roundAuto)
        .setDisplayScale(false)
    ]
  );

  let isBrushing = false;
  let brushLeft = 0;
  let brushRight = 0;

  function render(container: Selection<HTMLDivElement>) {
    innerWidth = outerWidth - paddings[1] - paddings[3];
    mainInnerHeight = mainHeight - paddings[0] - paddings[2];
    helperInnerHeight = helperHeight - helperPaddings[0] - helperPaddings[2];

    container.attr({
      'class': 'chart-container',
      style: `width: ${outerWidth}px`
    });

    const svgContainer = container.renderOne<SVGElement>('svg', 'svg').attr({
      width: outerWidth,
      height: mainHeight + helperHeight,
    });

    renderMain(container);

    fullTimeScale.setMinDomain(timeScale.getDomain());
    renderHelper(container);
    const svgSelection = svgContainer.renderOne<SVGGElement>('g', 0)
      .attr({
        transform: `translate(${paddings[3]},${paddings[0]})`
      });

    renderBrush(svgSelection, container);

    const mainInnerContainer = container.renderOne<HTMLDivElement>(
      'div',
      'rect',
      {'class': 'main-inner-container'}
    );

    mainInnerContainer.setStyles({
      width: `${outerWidth}px`,
      height: `${mainInnerHeight}px`
    });

    bindZoomEvens(mainInnerContainer, container);
    renderTooltip(mainInnerContainer, svgSelection);
    renderLegend(container);
  }

  function renderMain(container: Selection) {
    const mainCanvas = container
      .renderOne<HTMLCanvasElement>('canvas', 'main');
    setCanvasSize(mainCanvas, outerWidth, mainHeight);

    mainChart
      .setOuterWidth(toCanvasSize(outerWidth))
      .setOuterHeight(toCanvasSize(mainHeight))
      .setPaddings(paddings.map(toCanvasSize))
      .draw(mainCanvas.getContext());
  }

  function renderHelper(container: Selection) {
    const helperCanvas = container
      .renderOne<HTMLCanvasElement>('canvas', 'helper');

    setCanvasSize(helperCanvas, outerWidth, helperHeight);
    helperChart
      .setOuterWidth(toCanvasSize(outerWidth))
      .setOuterHeight(toCanvasSize(helperHeight))
      .setPaddings(helperPaddings.map(toCanvasSize))
      .draw(helperCanvas.getContext());
  }

  function setCanvasSize(
    canvas: Selection<HTMLCanvasElement>,
    width: number,
    height: number
  ) {
    canvas.attr({
      'class': 'chart-canvas',
      style: `width: ${width}px; height: ${height}px`,
      width: toCanvasSize(width),
      height: toCanvasSize(height)
    });
  }

  function toCanvasSize(size: number) {
    return Math.round(size * pixelRatio);
  }

  function addSeries(
    data: SeriesData,
    callback: (series: LineSeries, isHelper?: boolean) => void
  ) {
    const mainSeries = createLineSeries(
      timeScale,
      valueScale,
      data
    );
    callback(mainSeries);
    const helperSeries = createLineSeries(
      fullTimeScale,
      fullValueScale,
      data
    );
    callback(helperSeries, true);

    mainChart.series.push(mainSeries);
    helperChart.series.push(helperSeries);
    legend.seriesGroups.push([mainSeries, helperSeries]);
  }

  function getPointX(clientX: number, container: Selection) {
    return Math.round(
      (clientX - paddings[3] - container.getRect().left) *
      pixelRatio
    );
  }

  function renderLegend(container: Selection<HTMLDivElement>) {
    const legendContainer = container.renderOne('div', 'legend', {
      'class': 'legend-container'
    });
    legend.render(legendContainer);

    if (!legendContainer.isNew()) {
      return;
    }
    legend.clickEvent.on((seriesGroup) => {
      const hidden = !seriesGroup[0].isHidden();
      seriesGroup.forEach((series) => series.setHidden(hidden));
      render(container);
    });
  }

  function renderTooltip(
    mainInnerContainer: Selection<HTMLDivElement>,
    svgSelection: Selection<SVGGElement>
  ) {
    const tooltipContainer = mainInnerContainer
      .renderOne<HTMLDivElement>('div', 'tooltip');
    const lineContainer = svgSelection.renderOne('g', 'line');

    if (!mainInnerContainer.isNew()) {
      return;
    }

    tooltipContainer.on('mouseleave', (event: MouseEvent) => {
      const relatedSelection = new Selection(event.relatedTarget as any);
      if (relatedSelection.isDescendant(mainInnerContainer)) {
        return;
      }
      hideTooltip();
    });

    mainInnerContainer.on('mouseleave', (event: MouseEvent) => {
      const relatedSelection = new Selection(event.relatedTarget as any);
      if (relatedSelection.isDescendant(tooltipContainer)) {
        return;
      }
      hideTooltip();
    }).on('mousemove', ({clientX}: MouseEvent) => {
      const pointX = getPointX(clientX, mainInnerContainer);
      interface Point {
        distance: number;
        index: number;
        series: BaseSeries;
      }
      let firstPoint: Point | undefined;

      const results = mainChart.series.reduce((points, series) => {
        const nearest = !series.isHidden() && getNearestPoint(
          pointX,
          series.getData(),
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
      const time = firstSeries.getData().x[firstIndex];
      const lineX = firstSeries.xScale.scale(time) / pixelRatio;
      const left = Math.round(lineX + paddings[3]) - 20;
      const values = results.map((item) => {
        return item ? item.series.getData().y[item.index] : 0;
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
    });

    function hideTooltip() {
      tooltip.setHidden(true)
        .render(tooltipContainer, lineContainer);
    }
  }

  function bindZoomEvens(
    mainInnerContainer: Selection<HTMLDivElement>,
    container: Selection<HTMLDivElement>
  ) {
    if (!mainInnerContainer.isNew()) {
      return;
    }

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
          timeScale.invert().scale(getPointX(clientX, mainInnerContainer))
        )
      );
      zoomMainChart(startDomain, factor, offset, container);
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
    offset: number,
    container: Selection<HTMLDivElement>
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

  function renderBrush(
    svgSelection: Selection<SVGGElement>,
    container: Selection<HTMLDivElement>
  ) {
    const brushContainer = svgSelection.renderOne('g', 'brush').attr({
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

    if (!brushContainer.isNew()) {
      return;
    }

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
    const [startTime, endTime] = timeScale.getDomain();
    const [minTime, maxTime] = fullTimeScale.getDomain();
    const dateSpan = maxTime - minTime;

    if (!(dateSpan > 0)) {
      return {width: innerWidth, left: 0, right: innerWidth};
    }

    let [left, right] = roundRange(
      (startTime - minTime) / dateSpan * innerWidth,
      (endTime - minTime) / dateSpan * innerWidth
    );
    left = Math.max(0, Math.min(left, innerWidth));
    right = Math.max(left, Math.min(right, innerWidth));

    return {width: innerWidth, left, right};
  }

  const instance = {
    render,
    timeScale,
    addSeries,
    mainChart,
    helperChart,
    setPixelRatio,
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
