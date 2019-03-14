import {TimeChart} from './time-chart';
import {TimeSeriesData} from './lib/time-series-data';
import {Selection, addElement} from './lib/selection';

const timeChart = new TimeChart();
timeChart.setProps({
  outerWidth: 500,
  outerHeight: 500,
  helperHeight: 60
});

timeChart.addTimeSeries(new TimeSeriesData(
  [0, 0.4, 0.5, 0.6, 1],
  [0, 1, 0.5, 0.2, 0]
));

const svgSelection = new Selection(addElement('svg', document.body))
  .attr('width', window.innerWidth - 50)
  .attr('height', 600);

const chartSelection = svgSelection.renderOne(0, 'g');

timeChart.render(chartSelection);
