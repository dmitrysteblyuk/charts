import {TimeChart} from './time-chart';
import {SeriesData} from './lib/series-data';
import {Selection} from './lib/selection';

const timeChart = new TimeChart();
timeChart.setProps({
  chartOuterWidth: 500,
  chartOuterHeight: 700,
  helperHeight: 350
});

timeChart.addSeries(new SeriesData(
  [0, 1, 2, 3, 4, 5],
  [0, -1000, 500, 10000, -3800, 607]
));

const svgSelection = new Selection(document.body)
  .renderOne('svg', 'container')
  .attr('width', window.innerWidth - 50)
  .attr('height', 700);

const chartSelection = svgSelection.renderOne('g', 0);

timeChart.render(chartSelection);
