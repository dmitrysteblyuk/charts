import {TimeChart} from './time-chart';
import {SeriesData} from './lib/series-data';
import {Selection} from './lib/selection';

const timeChart = new TimeChart();
timeChart.addSeries(new SeriesData(
  [10, 11, 12, 13, 14, 15].map((date) => +new Date(`2019-03-${date}`)),
  [0, -1000, 500, 10000, 23800, 55607]
));

const svgSelection = new Selection(document.body)
  .renderOne('svg', 'container')
  .attr(
    'style',
    'touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0)'
  );
const chartSelection = svgSelection.renderOne('g', 0);

(window.onresize = () => {
  setSize();
  timeChart.render(chartSelection);
})();

function setSize() {
  const width = window.innerWidth - 50;
  const height = window.innerHeight - 50;

  timeChart.setProps({
    chartOuterWidth: width,
    chartOuterHeight: height,
    helperHeight: 250
  });

  svgSelection.attr({
    'width': width,
    'height': height
  });
}
