import {ChartScale} from '../chart/chart-scale';
import {binarySearch} from '../lib/binary-search';

export function getNearestPoint(
  centerX: number,
  xData: NumericData,
  xScale: ChartScale,
  maxDistance: number
) {
  const scaleX = xScale.getScale();
  const time = xScale.getInvertedScale()(centerX);
  const i1 = binarySearch(0, xData.length, (index) => time < xData[index]);
  const i0 = i1 - 1;

  return [i0, i1].reduce((result, index) => {
    if (index < 0 || index >= xData.length) {
      return result;
    }
    const distance = Math.abs(centerX - scaleX(xData[index]));
    if (distance > maxDistance || result && distance >= result.distance) {
      return result;
    }
    return {
      distance,
      index
    };
  }, null as ({distance: number, index: number} | null));
}
