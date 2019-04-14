import {TimeChart, createTimeChart} from './time-chart';
import {drawLineSeries} from './series/line';
import {drawBarSeries} from './series/bar';
import {drawPieSeries} from './series/pie';
import {drawStackedLineSeries} from './series/stacked-line';
import {createSeries, AnySeries} from './series';
import {Chart} from './chart';
import {Selection} from './lib/selection';
import './index.css';

export function getChartsRenderer(
  initialData: ChartConfig[],
  rootElement?: HTMLElement
) {
  const rootSelection = new Selection('div', rootElement);
  const containers = initialData.map((_, index) => {
    return rootSelection.renderOne('div', index, (container) => {
      container.setAttrs({'class': 'time-chart'});
    });
  });

  const charts = initialData.map(initializeChart);

  return {charts, render, rootSelection};

  function render(width: number) {
    charts.forEach((chart, index) => {
      chart
        .setOuterWidth(width)
        .setPixelRatio(window.devicePixelRatio)
        .render(containers[index]);
    });
  }
}

export interface ChartConfig {
  colors: {[id: string]: string},
  columns: [string, ...number[]][],
  names: {[id: string]: string}
}

export function initializeChart(config: ChartConfig, index: number) {
  const timeChart = createTimeChart();

  const ids = Object.keys(config['names']);
  const xData = (
    (config['columns'].find(([id]) => id === 'x') || []) as number[]
  ).splice(1, Infinity);
  const yData = ids.map((yId) => (
    (config['columns'].find(([id]) => id === yId) || []) as number[]
  ).splice(1, Infinity));
  const zoomedXData = xData.slice(20, 60);
  const zoomedYData = yData.map((data) => data.slice(20, 60));

  const line = index === 0;
  const percentage = index > 2;
  const stacked = index >= 2;
  const bar = index === 1;

  ids.forEach((yId, seriesIndex) => {
    const label = config['names'][yId];
    const color = config['colors'][yId];

    const [mainSeries, helperSeries] = [
      timeChart.mainChart,
      timeChart.helperChart
    ].map((chart, chartIndex) => {
      return initializeSeries(
        timeChart,
        chart,
        !chartIndex,
        xData,
        yData[seriesIndex],
        stacked,
        percentage,
        bar,
        line,
        color,
        label,
        zoomedXData,
        zoomedYData[seriesIndex]
      );
    });

    timeChart.addSeries(mainSeries, helperSeries);
  });

  const x0 = xData[Math.floor(xData.length * 0.75)];
  const x1 = xData[xData.length - 1] + (bar ? xData[1] - xData[0] : 0);
  timeChart.timeScale.setFixed(true).setDomain([x0, x1]);

  if (percentage) {
    [timeChart.valueScale, timeChart.fullValueScale].forEach((scale) => {
      scale.setFixed(true).setDomain([0, 1]);
    });
  }

  return timeChart;
}

export function initializeSeries(
  {
    fullTimeScale,
    fullValueScale,
    timeScale,
    valueScale
  }: TimeChart,
  {getXExtent}: Chart,
  isMain: boolean,
  xData: number[],
  yData: number[],
  stacked: boolean,
  percentage: boolean,
  bar: boolean,
  line: boolean,
  color: string,
  label: string,
  zoomedXData: number[],
  zoomedYData: number[]
) {
  const strokeWidth = isMain ? 2 : 1;
  const xScale = isMain ? timeScale : fullTimeScale;
  const yScale = isMain ? valueScale : fullValueScale;
  const baseSeries = createSeries(
    xScale,
    yScale,
    xData,
    [yData],
    stacked ? drawStackedLineSeries
      : bar ? drawBarSeries
      : drawLineSeries,
    stacked,
    percentage,
    bar,
    false,
    color,
    label,
    strokeWidth,
    getXExtent
  );
  const zoomedSeries: AnySeries[] = [];

  if (line) {
    zoomedSeries.push(createSeries(
      xScale,
      yScale,
      zoomedXData,
      [zoomedYData],
      stacked ? drawStackedLineSeries
        : bar ? drawBarSeries
        : drawLineSeries,
      stacked,
      percentage,
      bar,
      false,
      color,
      label,
      strokeWidth,
      getXExtent
    ));
  }

  if (percentage && !isMain) {
    zoomedSeries.push(createSeries(
      xScale,
      yScale,
      zoomedXData,
      [zoomedYData],
      stacked ? drawStackedLineSeries
        : bar ? drawBarSeries
        : drawLineSeries,
      stacked,
      percentage,
      bar,
      false,
      color,
      label,
      strokeWidth,
      getXExtent
    ));
  }

  if (percentage && isMain) {
    zoomedSeries.push(createSeries(
      xScale,
      yScale,
      zoomedXData,
      [zoomedYData],
      drawPieSeries,
      false,
      false,
      false,
      true,
      color,
      label,
      strokeWidth,
      getXExtent
    ));
  }

  return [baseSeries, ...zoomedSeries].map((item, index) => (
    item.setDisplay(!index)
      .setStackIndex(+!index)
  ));
}
