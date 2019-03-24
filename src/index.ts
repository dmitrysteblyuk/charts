import {TimeChart} from './time-chart';
import {SeriesData} from './lib/series-data';
import {Selection} from './lib/selection';

const timeNow = Date.now();
const timeChart = new TimeChart();
timeChart.addSeries(generateRandomData(50000000, timeNow), {
  color: 'steelblue',
  label: 'series #1'
});
timeChart.addSeries(generateRandomData(50000000, timeNow), {
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

function generateRandomData(count: number, endTime: number): SeriesData {
  const timeStep = 15000;
  const startTime = endTime - timeStep * count;
  let x: Float64Array;
  let y: Float64Array;
  try {
    x = new Float64Array(count);
    y = new Float64Array(count);
  } catch (error) {
    alert(error);
    return new SeriesData([], []);
  }

  const startY = 0;
  let minY = startY;
  let maxY = startY;

  x[0] = startTime;
  y[0] = startY;

  // tslint:disable no-bitwise
  for (let index = 1; index < count; ) {
    let randomNumber = Math.random() * 1e16 >>> 0;
    do {
      x[index] = startTime + timeStep * index;
      const nextY = y[index - 1] + (randomNumber & 1 ? 1 : -1.0598);
      y[index] = nextY;
      if (minY > nextY) {
        minY = nextY;
      } else if (maxY < nextY) {
        maxY = nextY;
      }
    }
    while (++index < count && (randomNumber = randomNumber >>> 1) > 0);
  }
  // tslint:enable no-bitwise

  // Throw in some peaks
  for (let index = 10; index-- > 0; ) {
    const randomY = Math.random() * (maxY - minY) + minY;
    y[Math.floor(Math.random() * count)] = randomY;
  }

  return new SeriesData(x, y);
}

function test(count: number, fn: (index: number) => any): [number, any] {
  const startTime = Date.now();
  let res: any;
  for (let index = 0; index < count; index++) {
    res = fn(index);
  }
  return [Date.now() - startTime, res];
}

(window as any).test = test;
(window as any).timeChart = timeChart;
