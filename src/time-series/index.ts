import {Selection} from '../lib/selection';
import {forEach, newArray} from '../lib/utils';
import {LinearScale} from '../lib/linear-scale';
import {TimeSeriesData} from '../lib/time-series-data';

export class TimeSeries {
  private color = 'steelblue';

  constructor(
    private xScale: LinearScale,
    private yScale: LinearScale,
    private data: TimeSeriesData
  ) {}

  setProps(props: {}) {
    forEach(props, (value, key) => this[key] = value);
  }

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
  data: TimeSeriesData,
  points: number[],
  startIndex: number,
  endIndex: number
): string {
  let lastX = scaleX(data.times[points[startIndex]]);
  let lastY = scaleY(data.values[points[startIndex]]);
  const path = ['M', lastX, ',', lastY];

  for (let index = startIndex + 1; index < endIndex; index++) {
    const nextX = scaleX(data.times[points[index]]);
    const nextY = scaleY(data.values[points[index]]);

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
