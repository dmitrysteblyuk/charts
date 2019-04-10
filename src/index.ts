import './array-polyfill';
import {TimeChart, createTimeChart} from './time-chart';
import {SeriesData} from './lib/series-data';
import {Selection} from './lib/selection';
import './index.css';

const rootSelection = (
  new Selection(document.body)
    .renderOne<HTMLDivElement>('div', 'rootContainer')
);

function initializeCharts(
  json: {
    colors: {[id: string]: string},
    columns: [string, ...number[]][],
    names: {[id: string]: string}
  }[]
) {
  const charts = json.map((config) => {
    const chart = createTimeChart();
    const ids = Object.keys(config['names']);
    const x = (
      config['columns'].find(([id]) => id === 'x') || []
    ).slice(1) as number[];

    ids.forEach((yId) => {
      const y = (
        config['columns'].find(([id]) => id === yId) || []
      ).slice(1) as number[];
      const label = config['names'][yId];
      const color = config['colors'][yId];

      chart.addSeries(new SeriesData(x, y), (series, isHelper) => {
        series.setStrokeWidth(isHelper ? 1 : 2)
          .setLabel(label)
          .setColor(color);
      });
    });

    chart.timeScale.setFixed(true)
      .setDomain([x[Math.floor(x.length * 0.75)], x[x.length - 1]]);

    return chart;
  });

  renderCharts(charts);

  window.onresize = () => {
    renderCharts(charts);
  };
}

function renderCharts(charts: TimeChart[]) {
  const chartOuterHeight = 300;
  const chartOuterWidth = 500;

  charts.forEach((chart, index) => {
    const container = rootSelection.renderOne<HTMLDivElement>('div', index)
      .setStyles({
        width: `${chartOuterWidth}px`,
        height: `${chartOuterHeight}px`
      });

    chart
      .setMainHeight(chartOuterHeight - 65)
      .setOuterWidth(chartOuterWidth)
      .setPixelRatio(window.devicePixelRatio)
      .render(container);
  });
}

initializeCharts((window as any).chartData);
