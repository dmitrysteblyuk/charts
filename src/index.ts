import {TimeChart} from './time-chart';
import {SeriesData} from './lib/series-data';
import {Selection} from './lib/selection';
import {isPositive} from './lib/utils';
import './index.css';

fetch('./chart_data.json')
  .then((data) => data.json())
  .catch((error) => {
    alert(error);
    return [];
  })
  .then(initializeCharts);

const currentDate = new Date();
currentDate.setUTCMinutes(0, 0, 0);
const currentTime = currentDate.getTime();

const svgSelection = new Selection(document.body)
  .renderOne<SVGElement>('svg', 'svgContainer')
  .attr('class', 'chart-svg');

const performanceDemoDiv = (
  document.getElementById('performanceDemo') as HTMLElement
);

function initializeCharts(
  json: {
    colors: {[id: string]: string},
    columns: [string, ...number[]][],
    names: {[id: string]: string}
  }[]
) {
  const charts = json.map((config) => {
    const chart = new TimeChart();
    const ids = Object.keys(config['names']);
    const [, ...x] = config['columns'].find(([id]) => id === 'x') || ['x'];

    ids.forEach((yId) => {
      const [, ...y] = config['columns'].find(([id]) => id === yId) || ['y'];
      const label = config['names'][yId];
      const color = config['colors'][yId];

      chart.addSeries(new SeriesData(x, y), {
        color,
        label
      });
    });

    return chart;
  });

  renderCharts(charts);

  window.onresize = () => {
    renderCharts(charts);
  };
  processRandomDataForm(charts[0]);
}

function processRandomDataForm(topChart: TimeChart) {
  const form = performanceDemoDiv.querySelector('form') as HTMLElement;
  const countInput = form.querySelector('input') as HTMLInputElement;
  const generateButton = new Selection(
    form.querySelector('button[type="submit"]') as HTMLButtonElement
  );
  const applyButton = new Selection(
    form.querySelector('button[type="button"]') as HTMLButtonElement
  );
  const formSelection = new Selection(form);
  const randomData: SeriesData[] = [];
  const realData: SeriesData[] = [];
  let showingRealData = true;

  formSelection.on('submit', (event) => {
    event.preventDefault();
    if (randomData.length) {
      return;
    }
    const count = Math.ceil(
      Math.abs(parseInt(countInput.value, 10)) / 2
    );
    if (!isPositive(count)) {
      return;
    }
    const data1 = generateRandomData(count, currentTime);
    if (!data1) {
      return;
    }
    const data2 = generateRandomData(count, currentTime);
    if (!data2) {
      return;
    }

    applyButton.attr('disabled', undefined);
    generateButton.attr('disabled', '');
    countInput.setAttribute('readonly', '');

    randomData.push(data1, data2);
  });

  applyButton.on('click', () => {
    [topChart.mainChart, topChart.helperChart].forEach((chart) => {
      chart.series.forEach((series, index) => {
        if (index >= 2) {
          return;
        }
        if (showingRealData) {
          realData[index] = series.getData();
        }
        series.setData((showingRealData ? randomData : realData)[index]);
      });
    });
    showingRealData = !showingRealData;
    applyButton.text(showingRealData ? 'Apply' : 'Back');
    topChart.render(svgSelection.selectOne(0) as Selection);
  });
}

function renderCharts(charts: TimeChart[]) {
  const svgWidth = window.innerWidth - 30;
  const viewHeight = (
    window.innerHeight -
    20 -
    performanceDemoDiv.getBoundingClientRect().height
  );
  const chartOuterHeight = Math.max(1, Math.floor(
    viewHeight > 900 ? viewHeight / 3
      : viewHeight > 600 ? viewHeight / 2
      : viewHeight
  ));

  const singleColumn = svgWidth < 1000;
  const chartOuterWidth = Math.floor(
    singleColumn ? svgWidth : svgWidth / 2
  );
  const svgHeight = (
    singleColumn
      ? charts.length * chartOuterHeight
      : (1 + Math.ceil((charts.length - 1) / 2)) * chartOuterHeight
  );

  svgSelection.attr({
    'width': svgWidth,
    'height': svgHeight
  });

  new Selection(document.body)
    .renderOne('div', 'tooltipContainers')
    .renderAll('div', charts, (selection: Selection<HTMLElement>, chart) => {
      chart.setProps({tooltipContainer: selection});
    });

  svgSelection.renderAll('g', charts, (container, chart, index) => {
    const translateX = (
      singleColumn || index === 0 || index % 2
        ? 0
        : chartOuterWidth
    );
    const translateY = (
      singleColumn ? index * chartOuterHeight
        : index === 0 ? 0
        : Math.floor((index + 1) / 2) * chartOuterHeight
    );

    container.attr(
      'transform',
      `translate(${translateX}, ${translateY})`
    );

    chart.setProps({
      chartOuterHeight,
      chartOuterWidth: index === 0 ? svgWidth : chartOuterWidth,
      helperHeight: 45
    })
      .render(container);
  });
}

function generateRandomData(
  count: number,
  endTime: number
): SeriesData | null {
  const timeStep = 15000;
  const startTime = endTime - timeStep * count;
  let x: Float64Array;
  let y: Float64Array;

  try {
    x = new Float64Array(count);
    y = new Float64Array(count);
  } catch (error) {
    alert(
      error +
      '. Likely you do not have enough memory, try fewer points.'
    );
    return null;
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
(window as any).generateRandomData = generateRandomData;

// (window as any).timeChart = timeChart;

// const timeNow = Date.now();
// const timeChart = new TimeChart();
// timeChart.addSeries(generateRandomData(50000000, timeNow), {
//   color: 'steelblue',
//   label: 'series #1'
// });
// timeChart.addSeries(generateRandomData(50000000, timeNow), {
//   color: 'forestgreen',
//   label: 'series #2'
// });

// const chartSelection = svgSelection.renderOne('g', 0);

// (window.onresize = () => {
//   setSize();
//   timeChart.setEnableTransitions(false);
//   timeChart.render(chartSelection);
//   timeChart.setEnableTransitions(true);
// })();

// function setSize() {
//   const width = window.innerWidth - 50;
//   const height = window.innerHeight - 50;

//   timeChart.setProps({
//     chartOuterWidth: width,
//     chartOuterHeight: height,
//     helperHeight: 250
//   });

//   svgSelection.attr({
//     'width': width,
//     'height': height
//   });
// }
