import {createTimeChart} from './time-chart';
import {drawLineSeries} from './series/line';
import {drawBarSeries} from './series/bar';
import {drawPieSeries} from './series/pie';
import {drawAreaSeries} from './series/area';
import {createSeries, AnySeries} from './series';
import {Chart} from './chart';
import {createScale, ChartScale} from './chart/chart-scale';
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
  names: {[id: string]: string},
  types: {[id: string]: 'bar' | 'line' | 'area'},
  y_scaled?: boolean,
  stacked?: boolean,
  percentage?: boolean
}

export function initializeChart(config: ChartConfig) {
  const twoYAxis = config['y_scaled'];
  const valueScales = [0, 1].map(() => {
    return (twoYAxis ? [0, 1] : [0]).map(() => createScale());
  });
  const timeChart = createTimeChart(valueScales[0]);

  const ids = Object.keys(config['names']);
  const xData = (
    (config['columns'].find(([id]) => id === 'x') || []) as number[]
  ).splice(1, Infinity);

  const yColumns = ids.map((yId) => (
    config['columns'].find(([id]) => id === yId)
  )).filter(Boolean) as ChartConfig['columns'];

  const zoomedXData = xData.slice(20, 60);
  const stacked = Boolean(config['stacked']);
  const percentage = Boolean(config['percentage']);
  let hasBar: boolean | undefined;

  yColumns.forEach((column, seriesIndex) => {
    const yData = column.splice(1, Infinity) as number[];
    const zoomedYData = yData.slice(20, 60);
    const yId = column[0];
    const label = config['names'][yId];
    const color = config['colors'][yId];
    const type = config['types'][yId];

    const line = type === 'line';
    const bar = type === 'bar';
    const area = type === 'area';
    if (bar) {
      hasBar = true;
    }

    const [mainSeries, helperSeries] = [
      timeChart.mainChart,
      timeChart.helperChart
    ].map((chart, chartIndex) => {
      const isMain = !chartIndex;
      const xScale = isMain ? timeChart.timeScale : timeChart.fullTimeScale;
      const yScale = valueScales[chartIndex][twoYAxis && seriesIndex ? 1 : 0];

      return initializeSeries(
        chart,
        isMain,
        xData,
        yData,
        xScale,
        yScale,
        stacked,
        percentage,
        line,
        bar,
        area,
        color,
        label,
        zoomedXData,
        zoomedYData
      );
    });

    timeChart.addSeries(mainSeries, helperSeries);
  });

  const x0 = xData[Math.floor(xData.length * 0.75)];
  const x1 = xData[xData.length - 1] + (hasBar ? xData[1] - xData[0] : 0);
  timeChart.timeScale.setFixed(true).setDomain([x0, x1]);

  if (percentage) {
    valueScales.forEach((chartScales) => {
      chartScales.forEach((scale) => {
        scale.setFixed(true).setDomain([0, 1]);
      });
    });
  }

  return timeChart;
}

export function initializeSeries(
  {getXExtent}: Chart,
  isMain: boolean,
  xData: number[],
  yData: number[],
  xScale: ChartScale,
  yScale: ChartScale,
  stacked: boolean,
  percentage: boolean,
  line: boolean,
  bar: boolean,
  area: boolean,
  color: string,
  label: string,
  zoomedXData: number[],
  zoomedYData: number[]
) {
  const strokeWidth = isMain ? 2 : 1;
  const baseSeries = createSeries(
    xScale,
    yScale,
    xData,
    [yData],
    area ? drawAreaSeries
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
      area ? drawAreaSeries
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
      area ? drawAreaSeries
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
