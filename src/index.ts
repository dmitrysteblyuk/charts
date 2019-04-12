import {TimeChart, createTimeChart} from './time-chart';
import {drawLineSeries} from './series/line';
import {drawBarSeries} from './series/bar';
import {drawStackedLineSeries} from './series/stacked-line';
import {createSeries, AnySeries} from './series';
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
    const chart = createTimeChart();

    const ids = Object.keys(config['names']);
    const x = (
      config['columns'].find(([id]) => id === 'x') || []
    ).slice(1) as number[];
    const line = index === 0;
    const percentage = index > 2;
    const stacked = index >= 2;
    const bar = index === 1;

    ids.forEach((yId) => {
      const y = (
        config['columns'].find(([id]) => id === yId) || []
      ).slice(1) as number[];

      const label = config['names'][yId];
      const color = config['colors'][yId];

      const [mainSeries, helperSeries] = [false, true].map(isHelper => {
        return initializeSeries(
          chart,
          isHelper,
          x,
          y,
          stacked,
          percentage,
          bar,
          line,
          color,
          label
        );
      });

      chart.addSeries(mainSeries, helperSeries);
    });

    const x0 = x[Math.floor(x.length * 0.75)];
    const x1 = x[x.length - 1] + (bar ? x[1] - x[0] : 0);
    chart.timeScale.setFixed(true);
    chart.timeScale.setDomain([x0, x1]);

    if (percentage) {
      [chart.valueScale, chart.fullValueScale].forEach((scale) => {
        scale.setFixed(true);
        scale.setDomain([0, 1]);
      });
    }

    return chart;
  });

  (window as any)['charts'] = charts;
  renderCharts(charts);

  window.onresize = () => {
    renderCharts(charts);
  };
}

function initializeSeries(
  chart: TimeChart,
  isHelper: boolean,
  x: number[],
  y: number[],
  stacked: boolean,
  percentage: boolean,
  bar: boolean,
  line: boolean,
  color: string,
  label: string
) {
  const xScale = isHelper ? chart.fullTimeScale : chart.timeScale;
  const yScale = isHelper ? chart.fullValueScale : chart.valueScale;
  const baseSeries = createSeries(
    xScale,
    yScale,
    x,
    [y],
    stacked ? drawStackedLineSeries
      : bar ? drawBarSeries
      : drawLineSeries,
    stacked,
    percentage,
    bar
  );

  if (line) {
    const zoomedSeries = createSeries(
      xScale,
      yScale,
      x.slice(20, 40),
      [y.slice(20, 40)],
      stacked ? drawStackedLineSeries
        : bar ? drawBarSeries
        : drawLineSeries,
      stacked,
      percentage,
      bar
    ).setDisplay(false);
    return [baseSeries, zoomedSeries].map(setOptions);
  }

  return [setOptions(baseSeries)];

  function setOptions(item: AnySeries) {
    return item.setLabel(label)
      .setColor(color)
      .setStrokeWidth(isHelper ? 1 : 2)
  }
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
