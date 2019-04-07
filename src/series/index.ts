import {memoizeOne} from '../lib/utils';
import {ChartScale, getExtendedDomain} from '../chart/chart-scale';
import {SeriesData} from '../lib/series-data';
import {binarySearch} from '../lib/binary-search';

export type BaseSeries = ReturnType<typeof createBaseSeries>;

export function createBaseSeries(
  xScale: ChartScale,
  yScale: ChartScale,
  data: SeriesData,
  draw: (context: CanvasRenderingContext2D) => void
) {
  let color = '';
  let label = '';
  let hidden = false;
  let enableTransitions = true;
  let pixelRatio = 1;

  const getYDomain = memoizeOne((
    startIndex: number,
    endIndex: number,
    seriesData: SeriesData
  ) => {
    return seriesData.getRange(
      startIndex + 1,
      endIndex,
      startIndex,
      startIndex
    ).map((index) => seriesData.y[index])
  });

  function resetData(_data: SeriesData) {
    data = _data;
    getYDomain.clearCache();
  }

  function extendXDomain(xDomain: NumberRange): NumberRange {
    const {x: dataX, size} = data;
    if (!dataX.length) {
      return xDomain;
    }
    return getExtendedDomain(xDomain, [dataX[0], dataX[size - 1]]);
  }

  function extendYDomain(yDomain: NumberRange): NumberRange {
    const {x: dataX, size} = data;
    if (!size) {
      return yDomain;
    }
    const xDomain = xScale.getDomain();
    const startIndex = Math.max(
      0,
      binarySearch(0, size, (index) => xDomain[0] < dataX[index]) - 1
    );
    const endIndex = Math.min(
      size,
      binarySearch(startIndex, size, (index) => xDomain[1] <= dataX[index]) + 1
    );

    const [minY, maxY] = getYDomain(startIndex, endIndex, data);
    return getExtendedDomain(yDomain, [minY, maxY]);
  }

  const instance = {
    xScale,
    yScale,
    draw,
    resetData,
    extendXDomain,
    extendYDomain,
    // tslint:disable max-line-length
    getColor: () => color,
    getLabel: () => label,
    isHidden: () => hidden,
    getPixelRatio: () => pixelRatio,
    getData: () => data,
    setColor: (_: typeof color) => (color = _, instance),
    setLabel: (_: typeof label) => (label = _, instance),
    setHidden: (_: typeof hidden) => (hidden = _, instance),
    setEnableTransitions: (_: typeof enableTransitions) => (enableTransitions = _, instance),
    setPixelRatio: (_: typeof pixelRatio) => (pixelRatio = _, instance)
    // tslint:enable max-line-length
  };
  return instance;
}
