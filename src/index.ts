import {TimeChart} from './time-chart';
import {SeriesData} from './lib/series-data';
import {Selection} from './lib/selection';

const timeChart = new TimeChart();
timeChart.setProps({
  chartOuterWidth: 500,
  chartOuterHeight: 500,
  helperHeight: 60
});

timeChart.addSeries(new SeriesData(
  [0, 0.4, 0.5, 0.6, 10, 20],
  [0, 1, 50, 100, -80, 67]
));

const svgSelection = new Selection(document.body)
  .renderOne('svg', 'container')
  .attr('width', window.innerWidth - 50)
  .attr('height', 600);

const chartSelection = svgSelection.renderOne('g', 0);

timeChart.render(chartSelection);
