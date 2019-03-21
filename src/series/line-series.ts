
import {Selection} from '../lib/selection';
import {newArray} from '../lib/utils';
import {SeriesData} from '../lib/series-data';
import {BaseSeries} from './index';

export class LineSeries extends BaseSeries {
  render(container: Selection) {
    const {data, xScale, yScale, color} = this;

    container.renderOne('path', 0, (selection) => {
      if (!data.size) {
        selection.attr('d', 'M-1,-1');
        return;
      }

      const line = drawLine(
        (x) => Math.round(xScale.scale(x)),
        (y) => Math.round(yScale.scale(y)),
        data,
        newArray(data.size, (index) => index),
        0,
        data.size
      );
      selection.attr({
        'stroke': color,
        'stroke-width': 1,
        'fill': 'none',
        'd': line
      });
    });
  }
}

function drawLine(
  scaleX: (x: number) => number,
  scaleY: (y: number) => number,
  data: SeriesData,
  points: number[],
  startIndex: number,
  endIndex: number
): string {
  let lastX = scaleX(data.x[points[startIndex]]);
  let lastY = scaleY(data.y[points[startIndex]]);
  const path = ['M', lastX, ',', lastY];

  for (let index = startIndex + 1; index < endIndex; index++) {
    const nextX = scaleX(data.x[points[index]]);
    const nextY = scaleY(data.y[points[index]]);

    if (lastX !== nextX) {
      lastX = nextX;
      if (lastY !== nextY) {
        lastY = nextY;
        path.push('L', nextX, ',', nextY);
      } else {
        path.push('H', nextX);
      }
    } else if (lastY !== nextY) {
      lastY = nextY;
      path.push('V', nextY);
    }
  }
  return path.join('');
}
