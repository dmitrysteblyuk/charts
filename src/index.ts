import {TimeChart} from './time-chart';
import {SeriesData} from './lib/series-data';
import {Selection} from './lib/selection';

const width = window.innerWidth - 50;
const timeChart = new TimeChart();
timeChart.setProps({
  chartOuterWidth: width,
  chartOuterHeight: 700,
  helperHeight: 350
});

timeChart.addSeries(new SeriesData(
  [0, 1, 2, 3, 4, 5],
  [0, -1000, 500, 10000, -3800, 607]
));

const svgSelection = new Selection(document.body)
  .renderOne('svg', 'container')
  .attr(
    'style',
    'touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0)'
  )
  .attr('width', width)
  .attr('height', 700);

const chartSelection = svgSelection.renderOne('g', 0);
timeChart.render(chartSelection);
