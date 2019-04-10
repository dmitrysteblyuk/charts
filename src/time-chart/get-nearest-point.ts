import {ChartScale} from '../chart/chart-scale';
import {SeriesXData} from '../lib/series-data';
import {binarySearch} from '../lib/binary-search';

export function getNearestPoint(
  centerX: number,
  {x: times, size}: SeriesXData,
  xScale: ChartScale,
  maxDistance: number
) {
  const scaleX = xScale.getScale();
  const time = xScale.getInvertedScale()(centerX);
  const i1 = binarySearch(0, size, (index) => time < times[index]);
  const i0 = i1 - 1;

  return [i0, i1].reduce((result, index) => {
    if (index < 0 || index >= size) {
      return result;
    }
    const distance = Math.abs(centerX - scaleX(times[index]));
    if (distance > maxDistance || result && distance >= result.distance) {
      return result;
    }
    return {
      distance,
      index
    };
  }, null as ({distance: number, index: number} | null));
}
