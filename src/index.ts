import {TimeChart, createTimeChart} from './time-chart';
import {drawLineSeries} from './series/line';
import {drawBarSeries} from './series/bar';
import {drawPieSeries} from './series/pie';
import {drawStackedLineSeries} from './series/stacked-line';
import {createSeries, AnySeries} from './series';
import {Chart} from './chart';
import {Selection} from './lib/selection';
import './index.css';

const rootSelection = (
  new Selection(document.body)
    .renderOne('div', 'rootContainer')
);

function initializeCharts(
  json: {
    colors: {[id: string]: string},
    columns: [string, ...number[]][],
    names: {[id: string]: string}
  }[]
) {
  const charts = json.map((config, index) => {
    const timeChart = createTimeChart();

    const ids = Object.keys(config['names']);
    const xData = (
      (config['columns'].find(([id]) => id === 'x') || []) as number[]
    ).slice(1);
    const yData = ids.map((yId) => (
      (config['columns'].find(([id]) => id === yId) || []) as number[]
    ).slice(1));
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
  });

  (window as any)['charts'] = charts;
  renderCharts(charts);

  window.onresize = () => {
    renderCharts(charts);
  };
}

function initializeSeries(
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

function renderCharts(charts: TimeChart[]) {
  const chartOuterWidth = 500;

  charts.forEach((chart, index) => {
    const container = rootSelection.renderOne('div', index)
      .setAttrs({'class': 'time-chart'})
      .setStyles({width: `${chartOuterWidth}px`});

    chart
      .setOuterWidth(chartOuterWidth)
      .setPixelRatio(window.devicePixelRatio)
      .render(container);
  });
}

initializeCharts((window as any).chartData);
