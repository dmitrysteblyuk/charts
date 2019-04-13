import {createChart, Chart} from '../chart';
import {createAxis, AxisPosition} from '../axis';
import {createBrush} from '../brush';
import {Selection} from '../lib/selection';
import {createScale, getExtendedDomain} from '../chart/chart-scale';
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
import {
  calculateStackedData,
  calculatePercentageData,
  XExtentCalculator,
  getSeriesData
} from '../chart/series-data';
import './index.css';

export type TimeChart = Readonly<ReturnType<typeof createTimeChart>>;

interface ChartConfig {
  chart: Chart;
  height: number;
  offsets: NumberRange;
  paddings: NumberRange;
  onRender: (chartContainer: Selection) => void
}

export function createTimeChart() {
  let outerWidth = 0;
  let pixelRatio = 1;

  const mainPaddings = [10, 10, 20, 10];
  const timeScale = createScale();
  const fullTimeScale = createScale(timeScale.getDomain);
  const valueScale = createScale();
  const fullValueScale = createScale();
  const brush = createBrush();
  const legend = createLegend([]);
  const tooltip = createTooltip(mainPaddings[0]);
  const getStackedData = memoize(calculateStackedData, 10);
  const getPercentageData = memoize(calculatePercentageData, 10);
  const helperChart = createChart(
    [],
    [],
    calculateStackedData,
    calculatePercentageData,
    setSeriesYData
  );
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
    [],
    calculateStackedData,
    calculatePercentageData,
    setSeriesYData
  );
  const mainConfig = {
    chart: mainChart,
    height: 300,
    offsets: [0, 0, 0, 0],
    paddings: mainPaddings,
    onRender: onMainChartRender
  };
  const helperConfig = {
    chart: helperChart,
    height: 65,
    offsets: [0, mainPaddings[1], 0, mainPaddings[3]],
    paddings: [0, 0, 0, 0],
    onRender: bindBrushEvents
  };

  let innerWidth = 0;
  let isBrushing = false;
  let brushLeft = 0;
  let brushRight = 0;
  let container: Selection;

  function render(_container: Selection) {
    container = _container;
    innerWidth = outerWidth - mainPaddings[1] - mainPaddings[3];

    const chartContainers = [mainConfig, helperConfig].map(renderChart);
    renderBrush(chartContainers[1]);
    renderLegend();
  }

  function renderChart(config: ChartConfig, index: number) {
    const {chart, height, paddings, offsets, onRender} = config;
    const chartContainer = container.renderOne('div', index, (selection) => {
      onRender(selection.setAttrs({
        'class': 'chart'
      }).setStyles({
        'padding': offsets.map((value) => `${value}px`).join(' '),
        'height': `${height}px`
      }));
    });

    const width = outerWidth - offsets[1] - offsets[3];
    const canvas = (
      chartContainer.renderOne<HTMLCanvasElement>('canvas', 0)
    ).setAttrs({
      'width': toCanvasSize(width),
      'height': toCanvasSize(height)
    });

    chart
      .setOuterWidth(toCanvasSize(width))
      .setOuterHeight(toCanvasSize(height))
      .setPixelRatio(pixelRatio)
      .setPaddings(paddings.map(toCanvasSize))
      .setXDomains();

    const context = canvas.getContext();
    if (context) {
      chart.draw(context);
    }
    return chartContainer;
  }

  function toCanvasSize(size: number) {
    return Math.round(size * pixelRatio);
  }

  function redraw() {
    [mainChart, helperChart].forEach((chart, index) => {
      const context = container
        .selectOne(index)!
        .selectOne<HTMLCanvasElement>(0)!
        .getContext();

      if (context) {
        chart.draw(context);
      }
    });
  }

  function renderSvg(chartContainer: Selection, config: ChartConfig) {
    const {paddings, offsets} = config;

    return chartContainer.renderOne<SVGElement>('svg', 1).setStyles({
      'margin': offsets.map((value) => `${value}px`).join(' ')
    }).setAttrs({
      'width': getInnerWidth(config),
      'height': getInnerHeight(config),
      'transform': `translate(${paddings[3]},${paddings[0]})`
    });
  }

  function getInnerHeight({height, paddings}: ChartConfig) {
    return height - paddings[0] - paddings[2];
  }

  function getInnerWidth({paddings, offsets}: ChartConfig) {
    return outerWidth - offsets[1] - offsets[3] - paddings[3] - paddings[1];
  }

  function onMainChartRender(mainContainer: Selection) {
    bindZoomEvents(mainContainer);
    bindTooltipEvents(mainContainer);
    mainContainer.on('dblclick', () => {
      toggleZoomedSeries();
    });
  }

  function setSeriesYData(
    series: AnySeries[],
    getXExtent: XExtentCalculator
  ) {
    getSeriesData(
      series,
      series.map(({toDraw}) => +toDraw()),
      getStackedData,
      getPercentageData,
      getXExtent,
      [timeScale.getDomain()],
      0
    ).forEach((yData, index) => {
      series[index].setYData(yData);
    });
  }

  function toggleZoomedSeries() {
    mainChart.series.concat(helperChart.series).forEach((series) => {
      series.setDisplay(!series.isDisplayed());
    });
    timeScale.setFixed(false);
    render(container);
  }

  function addSeries(mainSeries: AnySeries[], helperSeries: AnySeries[]) {
    mainChart.series.push(...mainSeries);
    helperChart.series.push(...helperSeries);
    legend.seriesGroups.push([...mainSeries, ...helperSeries]);
  }

  function getPointX(clientX: number, innerContainer: Selection) {
    return Math.round(
      (clientX - mainPaddings[3] - innerContainer.getRect()!.left) *
      pixelRatio
    );
  }

  function renderLegend() {
    const legendContainer = container.renderOne(
      'div',
      'legend',
      (selection) => {
        selection.setAttrs({'class': 'legend'});
        legend.clickEvent.on((group) => {
          const hidden = !group[0].isHidden();
          group.forEach((series) => series.setHidden(hidden));
          render(container);
        });
      }
    );
    legend.render(legendContainer);
  }

  function bindTooltipEvents(mainContainer: Selection) {
    mainContainer.on('mousemove', ({clientX, target}: MouseEvent) => {
      if (getTooltipContainer().hasDescendant(target as any)) {
        return;
      }

      const pointX = getPointX(clientX, mainContainer);
      interface Point {
        distance: number;
        index: number;
        series: AnySeries;
      }
      let firstPoint: Point | undefined;

      const results = mainChart.series.reduce((points, series) => {
        const nearest = series.toDraw() && getNearestPoint(
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
      const time = firstSeries.xData[firstIndex];
      const lineX = firstSeries.xScale.getScale()(time) / pixelRatio;
      const left = Math.round(lineX + mainPaddings[3]) - 20;
      const values = results.map((item) => {
        const yData = item && item.series.getMainYData();
        return item ? (yData ? yData[item.index] : 1) : 0;
      });

      tooltip
        .setTime(time)
        .setLeft(left)
        .show(true)
        .setSeries(results.map((item) => item && item.series))
        .setValues(values)
        .setLineX(lineX)
        .setLineY2(getInnerHeight(mainConfig))
        .setPixelRatio(pixelRatio);
      renderTooltip();
    }).on(
      'mouseleave', hideTooltip
    );

    function hideTooltip() {
      tooltip.show(false);
      renderTooltip();
    }

    function renderTooltip() {
      tooltip.render(
        renderSvg(mainContainer, mainConfig),
        getTooltipContainer()
      );
    }

    function getTooltipContainer() {
      return mainContainer.renderOne('div', 'tooltip', selection => (
        selection.setAttrs({'class': 'tooltip'})
      ));
    }
  }

  function bindZoomEvents(mainContainer: Selection) {
    let startWidth: number;
    let startDomain: NumberRange;
    let startPositions: ZoomPositions;
    let hasChanged: boolean;

    onZoomEvents(mainContainer, (positions, mode, event) => {
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
          timeScale.getInvertedScale()(getPointX(clientX, mainContainer))
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

  function renderBrush(helperContainer: Selection) {
    const {width, left, right} = (
      isBrushing && brush.getWidth() === innerWidth
        ? {width: innerWidth, left: brushLeft, right: brushRight}
        : getBrushExtentFromTimeScale()
    );

    brush.setHeight(getInnerHeight(helperConfig))
      .setWidth(width)
      .setLeft(left)
      .setRight(right)
      .render(renderSvg(helperContainer, helperConfig));
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
    render,
    redraw,
    mainConfig,
    helperConfig,
    addSeries,
    mainChart,
    helperChart,
    timeScale,
    fullTimeScale,
    valueScale,
    fullValueScale,
    setPixelRatio: (_: typeof pixelRatio) => (pixelRatio = _, instance),
    setOuterWidth: (_: typeof outerWidth) => (outerWidth = _, instance)
  };

  return instance;
}
