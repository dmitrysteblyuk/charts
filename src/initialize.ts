import {createTimeChart, TimeChart} from './time-chart';
import {drawLineSeries} from './series/line';
import {drawBarSeries} from './series/bar';
import {drawPieSeries} from './series/pie';
import {drawAreaSeries} from './series/area';
import {createSeries, AnySeries} from './series';
import {Chart} from './chart';
import {createScale, ChartScale, fitDomain} from './chart/chart-scale';
import {Selection} from './lib/selection';
import {padding} from './lib/format';
import './index.css';

export const defaultPrerenderArgs: [number, number] = [500, 2];

const oneDay = 24 * 3600 * 1000;
const dayTheme: Theme = {
  gridColor: '#182D3B',
  gridOpacity: 0.1,
  tickColor: '#8E8E93',
  tickOpacity: 1,
  tickFont: 'verdana, sans-serif',
  zoomOutText: '#108BE3',
  tooltipArrow: '#D2D5D7',
  brushMaskColor: '#E2EEF9',
  brushMaskOpacity: 0.6,
  brushHandleColor: '#C0D1E1',
  maskColor: '#FFFFFF',
  maskOpacity: 0.5,
  textColor: 'black',
  tooltipBackground: '#FFFFFF',
  tooltipBorderColor: '#ddd'
};

const nightTheme: Theme = {
  gridColor: '#FFFFFF',
  gridOpacity: 0.1,
  tickColor: '#A3B1C2',
  tickOpacity: 0.6,
  tickFont: 'verdana, sans-serif',
  zoomOutText: '#48AAF0',
  tooltipArrow: '#D2D5D7',
  brushMaskColor: '#304259',
  brushMaskOpacity: 0.6,
  brushHandleColor: '#56626D',
  maskColor: '#242F3E',
  maskOpacity: 0.5,
  textColor: 'white',
  tooltipBackground: '#1A2635',
  tooltipBorderColor: '#444'
};
let currentTheme = nightTheme;

export function getChartsRenderer(
  initialData: ChartConfig[],
  rootElement?: HTMLElement,
  bodyElement?: HTMLElement
) {
  const bodySelection = new Selection('', bodyElement);
  const rootSelection = new Selection('div', rootElement);

  const containers = initialData.map((_, index) => {
    return rootSelection.renderOne('div', index, (container) => {
      container.setAttrs({'class': 'time-chart'});
    });
  });

  const themeButton = rootSelection.renderOne('div', 'theme').setAttrs({
    'class': 'theme'
  }).renderOne('div', 0, (selection) => {
    selection.setAttrs({
      'role': 'button'
    }).on('click', switchTheme);
  });

  setCurrentTheme();

  const charts = initialData.map(initializeChart);

  return {charts, render, rootSelection};

  function render(width: number, pixelRatio: number) {
    charts.forEach((chart, index) => {
      chart
        .setOuterWidth(width)
        .setPixelRatio(pixelRatio)
        .render(containers[index]);
    });
  }

  function switchTheme() {
    currentTheme = currentTheme === dayTheme ? nightTheme : dayTheme;
    setCurrentTheme();
    charts.forEach((chart) => {
      chart.setTheme(currentTheme).render();
    });
  }

  function setCurrentTheme() {
    bodySelection.setStyles({
      backgroundColor: currentTheme.maskColor,
      color: currentTheme.textColor
    });

    themeButton.setStyles({
      color: currentTheme.zoomOutText
    }).text(
      `Switch to ${currentTheme === dayTheme ? 'Night' : 'Day'} Mode`
    );
  }
}

export interface ChartConfig {
  colors: {[id: string]: string},
  columns: [string, ...number[]][],
  names: {[id: string]: string},
  types: {[id: string]: 'bar' | 'line' | 'area'},
  y_scaled?: boolean,
  stacked?: boolean,
  percentage?: boolean
}

const titles = [
  'Followers',
  'Interactions',
  'Fruits',
  'Views',
  'Fruit market shares'
];

export function initializeChart(
  config: ChartConfig,
  chartIndex: number
) {
  const percentage = Boolean(config['percentage']);
  const twoYAxis = config['y_scaled'];
  const valueScales = [0, 1].map(() => (
    (twoYAxis ? [0, 1] : [0]).map(() => createScale(percentage))
  ));

  const timeChart = createTimeChart(
    valueScales[0],
    titles[chartIndex],
    chartIndex === 3,
    chartIndex === 4
  )
  .setTheme(currentTheme);

  const allCharts = [timeChart.mainChart, timeChart.helperChart];
  const initialSeries = initializeSeries(
    timeChart,
    allCharts,
    config,
    valueScales,
    null
  );
  initialSeries.forEach(
    (series) => timeChart.addSeries(series[0], series[1]
  ));

  let zoomInTime: number | null = null;
  let lastZoomDataLoadTime: number | null = null;
  let previousDomain: NumberRange;

  timeChart.zoomOutEvent.on(() => {
    zoomInTime = null;
    timeChart.timeScale.setDomain(previousDomain);
    timeChart.fullTimeScale.setFixed(false);
  });

  timeChart.tooltip.zoomSeriesEvent.on((time) => {
    zoomInTime = time;

    if (chartIndex === 4) {
      onZoomIn();
      showZoomedPieSeries(timeChart, time, initialSeries);
      return;
    }
    const zoomCharts = chartIndex === 3 ? [timeChart.mainChart] : allCharts;

    if (time === lastZoomDataLoadTime) {
      setZoomDomain(timeChart.timeScale, time);

      if (zoomCharts.length === 1) {
        setZoomDomain(timeChart.fullTimeScale, zoomInTime);
        timeChart.fullTimeScale.setFixed(true);
      }

      timeChart.toggleZoomedSeries(true);
      return;
    }

    const date = new Date(time);
    const day = padding(date.getDate());
    const month = padding(date.getMonth() + 1);
    const year = date.getFullYear();
    const url = `./chart-data/${chartIndex + 1}/${year}-${month}/${day}.json`;

    fetch(url)
      .then((response) => response.json())
      .then((seriesConfig) => {
        if (zoomInTime !== time) {
          return;
        }
        lastZoomDataLoadTime = time;

        onZoomIn();
        showZoomedSeries(
          timeChart,
          allCharts,
          initializeSeries(
            timeChart,
            zoomCharts,
            seriesConfig,
            valueScales,
            zoomInTime
          )
        );
      });
  });

  return timeChart;

  function onZoomIn() {
    previousDomain = timeChart.timeScale.getDomain();
    timeChart.setZoomedIn(true);
  }
}

function setZoomDomain(
  timeScale: ChartScale,
  zoomInTime: number,
  maxDomain?: NumberRange
) {
  let domain = [
    zoomInTime,
    zoomInTime + oneDay
  ];
  if (maxDomain) {
    domain = fitDomain(domain, maxDomain);
  }
  timeScale.setDomain(domain);
}

function showZoomedPieSeries(
  {mainChart, legend, timeScale, fullTimeScale, render}: TimeChart,
  zoomInTime: number,
  initialSeries: AnySeries[][]
) {
  const allSeries = mainChart.getSeries();
  let zoomedSeries = allSeries.filter(({isZoomed}) => isZoomed());

  if (!zoomedSeries.length) {
    zoomedSeries = initialSeries.map(([mainSeries]) => {
      return createSeries(
        timeScale,
        mainSeries.yScale,
        mainSeries.xData,
        [mainSeries.getOwnYData()],
        drawPieSeries,
        false,
        false,
        false,
        true,
        mainSeries.getColor(),
        mainSeries.getLabel(),
        1,
        mainChart.getXExtent,
        true
      ).setHidden(mainSeries.isHidden());
    });

    mainChart.setSeries(allSeries.concat(zoomedSeries));
    legend.getSeriesGroups().forEach((group, index) => {
      group.push(zoomedSeries[index]);
    });
  }

  allSeries.forEach(({setDisplay, isZoomed}) => setDisplay(isZoomed()));

  const maxDomain = zoomedSeries[0].getXDomain();
  setZoomDomain(timeScale, zoomInTime, maxDomain);

  fullTimeScale.setDomain(fitDomain(
    [zoomInTime - 3 * oneDay, zoomInTime + 4 * oneDay],
    maxDomain
  ));
  fullTimeScale.setFixed(true);

  render();
}

function showZoomedSeries(
  {legend, render}: TimeChart,
  allCharts: Chart[],
  newZoomedSeries: AnySeries[][]
) {
  allCharts.forEach((chart, index) => {
    const allSeries = chart.getSeries().filter(({isZoomed}) => !isZoomed());
    allSeries.forEach((series) => {
      series.setDisplay(false);
    });

    if (index < newZoomedSeries[0].length) {
      allSeries.push(...newZoomedSeries.map((series) => series[index]));
      chart.setSeries(allSeries);
    }
  });

  const seriesGroups = legend.getSeriesGroups().map(
    (group) => group.filter(({isZoomed}) => !isZoomed())
  ).filter(
    ({length}) => length
  );

  newZoomedSeries.forEach((series) => {
    const label = series[0].getLabel();
    const group = seriesGroups.find(([{getLabel}]) => getLabel() === label);

    if (group) {
      if (group[0].isHidden()) {
        series.forEach(({setHidden}) => setHidden(true));
      }
      group.push(...series);
    } else {
      seriesGroups.push(series);
    }
  });
  legend.setSeriesGrousp(seriesGroups);

  render();
}

function initializeSeries(
  {timeScale, fullTimeScale}: TimeChart,
  charts: Chart[],
  config: ChartConfig,
  valueScales: ChartScale[][],
  zoomInTime: number | null
) {
  const stacked = Boolean(config['stacked']);
  const percentage = Boolean(config['percentage']);
  const twoYAxis = config['y_scaled'];

  const ids = Object.keys(config['names']);
  const xData = (
    (config['columns'].find(([id]) => id === 'x') || []) as number[]
  ).splice(1, Infinity);

  const yColumns = ids.map((yId) => (
    config['columns'].find(([id]) => id === yId)
  )).filter(Boolean) as ChartConfig['columns'];

  if (zoomInTime === null) {
    const hasBar = yColumns.some(
      (column) => config['types'][column[0]] === 'bar'
    );
    const x0 = xData[Math.floor(xData.length * 0.75)];
    const x1 = xData[xData.length - 1] + (hasBar ? xData[1] - xData[0] : 0);
    timeScale.setDomain([x0, x1]);
  } else {
    setZoomDomain(timeScale, zoomInTime);

    if (charts.length === 1) {
      setZoomDomain(fullTimeScale, zoomInTime);
      fullTimeScale.setFixed(true);
    }
  }

  return yColumns.map((column, seriesIndex) => {
    const yData = column.splice(1, Infinity) as number[];
    const yId = column[0];
    const label = config['names'][yId];
    const color = config['colors'][yId];
    const type = config['types'][yId];
    const bar = type === 'bar';
    const area = type === 'area';

    return charts.map(({getXExtent}, index) => {
      const isMain = !index;
      const xScale = isMain ? timeScale : fullTimeScale;
      const yScale = valueScales[index][twoYAxis && seriesIndex ? 1 : 0];

      return createSeries(
        xScale,
        yScale,
        xData,
        [yData],
        area ? drawAreaSeries
          : bar ? drawBarSeries
          : drawLineSeries,
        stacked,
        percentage,
        bar,
        false,
        color,
        label,
        isMain ? 2 : 1,
        getXExtent,
        zoomInTime !== null
      );
    });
  });
}
