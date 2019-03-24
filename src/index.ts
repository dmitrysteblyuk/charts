import {TimeChart} from './time-chart';
import {SeriesData} from './lib/series-data';
import {Selection} from './lib/selection';

const timeChart = new TimeChart();
timeChart.addSeries(new SeriesData(
  [10, 11, 12, 13, 14, 15].map((date) => +new Date(`2019-03-${date}`)),
  [0, -1000, 500, 10000, 23800, 55607]
), {
  color: 'steelblue',
  label: 'series #1'
});
timeChart.addSeries(new SeriesData(
  [1, 2, 5, 12].map((date) => +new Date(`2019-03-${date}`)),
  [3000, -21000, -500, 5000]
), {
  color: 'forestgreen',
  label: 'series #2'
});

const svgSelection = new Selection(document.body)
  .renderOne('svg', 'svgContainer')
  .attr(
    'style',
    'touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0)'
  );
const chartSelection = svgSelection.renderOne('g', 0);

(window.onresize = () => {
  setSize();
  timeChart.setEnableTransitions(false);
  timeChart.render(chartSelection);
  timeChart.setEnableTransitions(true);
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

function test(count: number, fn: (index: number) => any): [number, any] {
  const startTime = Date.now();
  let res: any;
  for (let index = 0; index < count; index++) {
    res = fn(index);
  }
  return [Date.now() - startTime, res];
}

function getRandomBitsFast(count: number, callback: (bit: number) => void) {
  for (let index = 0; index < count; ) {
    let randomNumber = Math.random() * 1e16 >>> 0;
    do {
      callback(randomNumber & 1);
      index++;
    } while((randomNumber = randomNumber >>> 1) > 0);
  }
}

function getRandomBitsSimple(count: number, callback: (bit: number) => void) {
  for (let index = 0; index < count; index++) {
    callback(Math.random() > .5 ? 1 : 0);
  }
}

(window as any).test = test;
(window as any).getRandomBitsFast = getRandomBitsFast;
(window as any).getRandomBitsSimple = getRandomBitsSimple;
