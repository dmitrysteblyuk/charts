import {binarySearch} from '../lib/binary-search';
import {getPieRadius} from '../series/pie';
import {AnySeries} from '../series';

export function getNearestPoint(
  visibleSeries: AnySeries[],
  pointX: number,
  pointY: number,
  centerX: number,
  centerY: number,
  pixelRatio: number
) {
  const firstSeries = visibleSeries[0];

  if (!firstSeries.pie) {
    const {xData, xScale} = firstSeries;
    const time = xScale.getInvertedScale()(pointX * pixelRatio);
    const i1 = (
      binarySearch(0, xData.length - 1, (index) => time < xData[index])
    );
    const i0 = i1 - 1;
    return 2 * time < xData[i0] + xData[i1] ? i0 : i1;
  }

  const radius = getPieRadius(centerX, centerY);
  if ((pointX -= centerX) ** 2 + (pointY -= centerY) ** 2 > radius ** 2) {
    return -1;
  }
  let angle = Math.atan2(pointY, pointX);
  if (angle < 0) {
    angle += 2 * Math.PI;
  }

  return visibleSeries.findIndex(({getYData}) => {
    const angles = getYData()[1];
    return angle >= angles[1] && angle <= angles[0];
  });
}
