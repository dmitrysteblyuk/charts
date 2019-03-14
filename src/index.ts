import {TimeChart} from './time-chart';
import {Selection, addElement} from './lib/selection';

const timeChart = new TimeChart();
timeChart.setProps({
  outerWidth: 500,
  outerHeight: 500,
  helperHeight: 60
});

const svgSelection = new Selection(addElement('svg', document.body))
  .attr('width', window.innerWidth - 50)
  .attr('height', 600);

const chartSelection = svgSelection.renderOne(0, 'g');

timeChart.render(chartSelection);
