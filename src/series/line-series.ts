import {Selection} from '../lib/selection';
import {newArray} from '../lib/utils';
import {SeriesData} from '../lib/series-data';
import {Series} from './index';

export class LineSeries extends Series {
  render(container: Selection) {
    const {data, xScale, yScale, color} = this;

    container.renderOne('path', 0, (selection) => {
      if (!data.size) {
        selection.attr('d', 'M-1,-1');
        return;
      }

      selection.attr('d', drawPath(
        (x) => Math.round(xScale.scale(x)),
        (y) => Math.round(yScale.scale(y)),
        data,
        newArray(data.size, (index) => index),
        0,
        data.size
      ))
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('fill', 'none');
    });
  }
}

function drawPath(
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
