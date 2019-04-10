import {TimeChart, createTimeChart} from './time-chart';
import {createSeriesXData, createSeriesYData} from './lib/series-data';
// import {drawLineSeries} from './series/line';
// import {drawBarSeries} from './series/bar';
import {drawStackedLineSeries} from './series/stacked-line';
import {createSeries, SeriesType} from './series';
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
    const x = new Float64Array((
      config['columns'].find(([id]) => id === 'x') || []
    ).slice(1) as number[]);

    ids.forEach((yId) => {
      const y = new Float64Array((
        config['columns'].find(([id]) => id === yId) || []
      ).slice(1) as number[]);

      const label = config['names'][yId];
      const color = config['colors'][yId];

      const [mainSeries, helperSeries] = [0, 1].map(isHelper => {
        const series = createSeries(
          isHelper ? chart.fullTimeScale : chart.timeScale,
          isHelper ? chart.fullValueScale : chart.valueScale,
          createSeriesXData(x),
          [createSeriesYData(y)],
          drawStackedLineSeries,
          SeriesType.StackedLine
        );

        series.setLabel(label)
          .setColor(color)
          .setStrokeWidth(isHelper ? 1 : 2);

        return series;
      });

      chart.addSeries(mainSeries, helperSeries);
    });

    const x0 = x[Math.floor(x.length * 0.75)];
    const x1 = x[x.length - 1]/* + x[1] - x[0]*/;
    chart.timeScale.setFixed(true);
    chart.timeScale.setDomain([x0, x1]);

    return chart;
  });

  (window as any)['charts'] = charts;
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
