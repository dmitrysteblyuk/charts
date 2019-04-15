import {createChart, Chart} from '../chart';
import {createAxis, AxisPosition} from '../axis';
import {createBrush} from '../brush';
import {Selection} from '../lib/selection';
import {createScale, ChartScale, fitDomain} from '../chart/chart-scale';
import {getDecimalScaleTicks} from '../lib/decimal-scale-ticks';
import {getTimeScaleTicks} from '../lib/time-scale-ticks';
import {AnySeries} from '../series';
import {createLegend} from '../legend';
import {onZoomEvents, ZoomMode, ZoomPositions} from '../lib/zoom';
import {roundRange} from '../lib/utils';
import {EventEmitter} from '../lib/event-emitter';
import {memoize} from '../lib/memoize';
import {getZoomFactorAndOffset} from './zoom-transform';
import {
  axisTimeFormat,
  roundAuto,
  dateFormat,
  timeFormat
} from '../lib/format';
import {createTooltip} from '../tooltip';
import {getNearestPoint} from './get-nearest-point';
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
  className: string;
  height: number;
  offsets: NumberRange;
  paddings: NumberRange;
  onRender: (chartContainer: Selection) => void
}

export function createTimeChart(
  valueScales: ChartScale[],
  title: string,
  hideHelperOnZoomIn: boolean,
  hideAxisOnZoomIn: boolean
) {
  let outerWidth = 0;
  let pixelRatio = 1;
  let zoomedIn = false;
  let theme: Theme;

  const mainPaddings = [10, 10, 20, 10];
  const timeScale = createScale(true);
  const fullTimeScale = createScale(false);
  const legend = createLegend();
  const getStackedData = memoize(calculateStackedData, 10);
  const getPercentageData = memoize(calculatePercentageData, 10);
  const helperChart = createChart(
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
        valueScales[0],
        memoize(getDecimalScaleTicks, 1),
        yAxisFormat,
        false,
        true
      )
    ],
    calculateStackedData,
    calculatePercentageData,
    setSeriesYData
  );
  const zoomOutEvent = new EventEmitter<void>();

  if (valueScales.length > 1) {
    mainChart.axes.push(
      createAxis(
        AxisPosition.right,
        valueScales[1],
        memoize(getDecimalScaleTicks, 1),
        yAxisFormat
      )
    );
  }

  const tooltip = createTooltip(
    mainPaddings,
    mainChart.getSeries
  );

  const mainConfig = {
    className: 'main',
    chart: mainChart,
    height: 300,
    offsets: [0, 0, 0, 0],
    paddings: mainPaddings,
    onRender: onMainChartRender
  };
  const helperConfig = {
    className: 'helper',
    chart: helperChart,
    height: 65,
    offsets: [0, mainPaddings[1], 0, mainPaddings[3]],
    paddings: [0, 0, 0, 0],
    onRender: bindBrushEvents
  };
  const brush = createBrush(helperConfig.height);

  let innerWidth = 0;
  let mainInnerHeight = 0;
  let container: Selection;

  function render(_container?: Selection) {
    if (_container) {
      container = _container;
    }

    innerWidth = outerWidth - mainPaddings[1] - mainPaddings[3];
    mainInnerHeight = mainConfig.height - mainPaddings[0] - mainPaddings[2];

    renderHeader();
    const chartContainers = [mainConfig, helperConfig].map(renderChart);
    renderBrush(chartContainers[1]);
    renderLegend();
    tooltip.update();
  }

  function renderHeader() {
    const headerSelection = container.renderOne('div', 0, (selection) => {
      selection.setAttrs({'class': 'header'});
    });

    headerSelection.renderOne('div', 0, (selection) => {
      selection.setAttrs({'class': 'title'}).text(title);
    }).toggle(!zoomedIn);

    headerSelection.renderOne('div', 1, (selection) => {
      selection.setAttrs({'class': 'zoom-out', 'role': 'button'})
        .setStyles({'display': 'none'})
        .text('Zoom out')
        .on('click', () => toggleZoomedSeries(false));
    }).setStyles({
      'color': theme.zoomOutText
    }).toggle(zoomedIn);

    const timeSpanText = timeScale.getDomain()
      .map(zoomedIn ? timeFormat : dateFormat)
      .filter((value, index, array) => !index || value !== array[index - 1])
      .join(' - ');

    headerSelection.renderOne('div', 2, (selection) => {
      selection.setAttrs({'class': 'time-span'});
    }).text(timeSpanText);
  }

  function toggleZoomedSeries(displayZoomed: boolean) {
    if (displayZoomed === zoomedIn) {
      return;
    }

    [...mainChart.getSeries(), ...helperChart.getSeries()].forEach(({
      setDisplay,
      isZoomed
    }) => {
      setDisplay(isZoomed() === displayZoomed);
    });

    setZoomedIn(displayZoomed);
    if (!displayZoomed) {
      zoomOutEvent.emit();
    }
    render();
  }

  function renderChart(config: ChartConfig, index: number) {
    const {chart, height, paddings, offsets, onRender} = config;
    const key = index + 1;

    const chartContainer = container.renderOne('div', key, (selection) => {
      onRender(selection.setAttrs({
        'class': `chart ${config.className}`
      }).setStyles({
        'padding': offsets.map((value) => `${value}px`).join(' '),
        'height': `${height}px`
      }));
    }).toggle(!isChartHidden(index));

    if (isChartHidden(index)) {
      return chartContainer;
    }

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

  function isChartHidden(index: number) {
    return index && hideHelperOnZoomIn && zoomedIn;
  }

  function toCanvasSize(size: number) {
    return Math.round(size * pixelRatio);
  }

  function redraw() {
    [mainChart, helperChart].forEach((chart, index) => {
      if (isChartHidden(index)) {
        return;
      }

      const context = container
        .selectOne(index + 1)!
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
  }

  function setSeriesYData(
    series: AnySeries[],
    getXExtent: XExtentCalculator
  ) {
    getSeriesData(
      series,
      series.map(({toDraw}) => +toDraw()),
      series.map(({isDisplayed}) => +isDisplayed()),
      getStackedData,
      getPercentageData,
      getXExtent,
      [timeScale.getDomain()],
      1
    ).forEach((yData, index) => {
      series[index].setYData(yData);
    });
  }

  function addSeries(mainSeries: AnySeries, helperSeries: AnySeries) {
    mainChart.getSeries().push(mainSeries);
    helperChart.getSeries().push(helperSeries);
    legend.getSeriesGroups().push([mainSeries, helperSeries]);
  }

  function getPoint(
    clientX: number,
    clientY: number,
    innerContainer: Selection
  ) {
    const {left, top} = innerContainer.getRect()!;
    return [
      clientX - mainPaddings[3] - left,
      clientY - mainPaddings[0] - top
    ];
  }

  function yAxisFormat(tick: number) {
    return String(roundAuto(tick));
  }

  function renderLegend() {
    const legendContainer = container.renderOne(
      'div',
      3,
      (selection) => {
        selection.setAttrs({'class': 'legend'});
        legend.clickEvent.on((group) => {
          const hidden = !group[0].isHidden();
          group.forEach((series) => series.setHidden(hidden));
          render();
        });
      }
    );
    legend.render(legendContainer);
  }

  function bindTooltipEvents(mainContainer: Selection) {
    tooltip.seriesFocusEvent.on(mainChart.redraw);

    mainContainer.on('mousemove', ({clientX, clientY, target}: MouseEvent) => {
      if (getTooltipContainer().hasDescendant(target as any)) {
        return;
      }
      const allSeries = mainChart.getSeries();
      const visibleSeries = allSeries.filter(({toDraw}) => toDraw());
      let point: number[] | undefined;
      let index = -1;

      if (visibleSeries.length) {
        point = getPoint(clientX, clientY, mainContainer);
        index = getNearestPoint(
          visibleSeries,
          point[0],
          point[1],
          innerWidth / 2,
          mainInnerHeight / 2,
          pixelRatio
        );
      }

      if (index === -1) {
        hideTooltip();
        return;
      }

      const firstSeries = visibleSeries[0];
      if (firstSeries.pie) {
        tooltip
          .setLeft(point![0])
          .setTop(point![1])
          .setPieSeries(
            visibleSeries[index],
            visibleSeries.length > 1
          );
      } else {
        const time = firstSeries.xData[index];

        tooltip
          .setDataIndex(index)
          .setTime(time)
          .setTop(0)
          .setLineY2(getInnerHeight(mainConfig))
          .setPieSeries(null);
      }

      tooltip.setPixelRatio(pixelRatio).show(true);
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
        renderSvg(mainContainer, mainConfig).renderOne('g', 0),
        getTooltipContainer(),
        mainContainer
      );
    }

    function getTooltipContainer() {
      return mainContainer.renderOne('div', 'tooltip', (selection) => {
        selection.setAttrs({
          'class': 'tooltip'
        }).setStyles({
          'display': 'none'
        });
      });
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
        (clientX) => timeScale.getInvertedScale()(
          getPoint(clientX, 0, mainContainer)[0] * pixelRatio
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

    let nextStartTime = factor * startTime + offset;
    let nextEndTime = factor * endTime + offset;
    const extend = (nextEndTime - nextStartTime - getMinTimeSpan()) / 2;

    if (extend < 0) {
      nextEndTime -= extend;
      nextStartTime += extend;
    }

    timeScale.setDomain(fitDomain(
      [nextStartTime, nextEndTime],
      fullTimeScale.getDomain()
    ));

    render();
  }

  function getMinTimeSpan() {
    const inverted = fullTimeScale.getInvertedScale();
    const minBrushWidth = brush.getMinWidth() * pixelRatio;
    return Math.ceil(inverted(minBrushWidth) - inverted(0));
  }

  function renderBrush(helperContainer: Selection) {
    if (!brush.isBrushing() || brush.getWidth() !== innerWidth) {
      const {width, left, right} = getBrushExtentFromTimeScale();
      brush.setWidth(width)
        .setLeft(left)
        .setRight(right);
    }
    brush.render(renderSvg(helperContainer, helperConfig));
  }

  function bindBrushEvents() {
    brush.changeEvent.on((next) => {
      setBrushExtentToTimeScale(next.left, next.right);
      render();
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
    legend,
    tooltip,
    render,
    redraw,
    mainConfig,
    helperConfig,
    addSeries,
    mainChart,
    helperChart,
    timeScale,
    fullTimeScale,
    zoomOutEvent,
    setZoomedIn,
    toggleZoomedSeries,
    setTheme,
    isZoomed: () => zoomedIn,
    setPixelRatio: (_: typeof pixelRatio) => (pixelRatio = _, instance),
    setOuterWidth: (_: typeof outerWidth) => (outerWidth = _, instance)
  };

  function setTheme(_theme: Theme) {
    brush.setTheme(theme = _theme);
    tooltip.setTheme(theme);
    mainChart.setTheme(theme);
    return instance;
  }

  function setZoomedIn(_zoomedIn: boolean) {
    zoomedIn = _zoomedIn;
    tooltip.setZoomedIn(zoomedIn);
    if (hideAxisOnZoomIn) {
      mainChart.setAxesHidden(zoomedIn);
    }
    return instance;
  }

  return instance;
}
