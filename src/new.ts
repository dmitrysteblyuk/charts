import {TimeChart} from './time-chart';
import {SeriesData} from './lib/series-data';
import {isPositive, setProps} from './lib/utils';
import './index.css';
import {
  VirtualDomElement,
  connectToElement
} from './lib/virtual-node/dom-element';

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

const rootNode = new VirtualDomElement('div')
  .renderOne('div', 'rootContainer');

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
    const x = (
      config['columns'].find(([id]) => id === 'x') || []
    ).slice(1) as number[];

    ids.forEach((yId) => {
      const y = (
        config['columns'].find(([id]) => id === yId) || []
      ).slice(1) as number[];
      const label = config['names'][yId];
      const color = config['colors'][yId];

      chart.addSeries(new SeriesData(x, y), {
        color,
        label
      }, {
        strokeWidth: 1
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
  const nativeForm = performanceDemoDiv.querySelector('form') as HTMLElement;
  const countInput = connectToElement(
    nativeForm.querySelector('input') as HTMLInputElement
  );
  const generateButton = connectToElement(
    nativeForm.querySelector('button[type="submit"]') as HTMLButtonElement
  );
  const applyButton = connectToElement(
    nativeForm.querySelector('button[type="button"]') as HTMLButtonElement
  );

  const randomData: SeriesData[] = [];
  const realData: SeriesData[] = [];
  let showingRealData = true;

  connectToElement(nativeForm, {
    onsubmit(event) {
      event.preventDefault();
      if (randomData.length) {
        return;
      }
      const count = Math.ceil(
        Math.abs(parseInt(countInput.getConnection().element.value, 10)) / 2
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

      applyButton.updateProps({'disabled': undefined});
      generateButton.updateProps({'disabled': ''});
      countInput.updateProps({'readonly': ''});

      randomData.push(data1, data2);
    }
  });

  applyButton.updateProps({
    onclick() {
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
      applyButton.updateProps({
        textContent: showingRealData ? 'Apply' : 'Back'
      });
      // topChart.render(rootNode.selectOne('chart:0') as VirtualDomElement);
    }
  });
}

function renderCharts(charts: TimeChart[]) {
  const fullWidth = window.innerWidth - 30;
  const viewHeight = (
    window.innerHeight -
    20 -
    performanceDemoDiv.getBoundingClientRect().height
  );
  const chartOuterHeight = Math.max(250, Math.floor(
    viewHeight > 900 ? viewHeight / 3
      : viewHeight > 600 ? viewHeight / 2
      : viewHeight
  ));

  const singleColumn = fullWidth < 1000;
  const chartOuterWidth = Math.max(250, Math.floor(
    singleColumn ? fullWidth : fullWidth / 2
  ));

  connectToElement(document.body)
    .renderOne('div', 'tooltipContainers')
    .renderAll('div', 'tooltip', charts)
    // .forEach((node) => {
    //   setProps(node.getDatum(), {tooltipContainer: node});
    // });

  rootNode.renderAll('svg', 'chart', charts, () => ({
    'class': 'chart-svg'
  })).forEach((container, index) => {
    container.updateProps({
      'width': index === 0 ? fullWidth : chartOuterWidth,
      'height': chartOuterHeight
    });

    setProps(container.getDatum(), {
      chartOuterHeight,
      chartOuterWidth: index === 0 ? fullWidth : chartOuterWidth,
      helperHeight: 45
    })/*.render(
      container
    )*/;
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
      'Seems like you do not have enough memory, try fewer points. ' + error
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
