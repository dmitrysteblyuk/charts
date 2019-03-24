import {Selection} from '../lib/selection';
import {newArray} from '../lib/utils';
import {Scale} from '../lib/scale';
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

      const {fromYDomain} = selection.getPreviousData({
        fromYDomain: yScale.getDomain()
      });

      if (
        !fromYDomain ||
        !this.enableTransitions ||
        selection.isAttrTransitioning('transform')
      ) {
        return;
      }
      selection.attrTransition('transform', (progress: number) => {
        if (progress === 1) {
          return '';
        }
        const [yFactor, yOffset] = getTransform(yScale, fromYDomain, progress);
        return `scale(1,${yFactor})translate(0,${yOffset})`;
      });
    }, this.hidden);
  }
}

function getTransform(
  yScale: Scale,
  [vs0, vs1]: NumberRange,
  progress: number
) {
  const [v0, v1] = yScale.getDomain();
  const [vn0, vn1] = [
    vs0 + (v0 - vs0) * progress,
    vs1 + (v1 - vs1) * progress
  ];
  const [yn0, yn1] = [vn0, vn1].map(yScale.scale);
  const [y0, y1] = [v0, v1].map(yScale.scale);
  const factor = (y1 - y0) / (yn1 - yn0);
  const offset = (yn1 * y0 - yn0 * y1) / (yn1 - yn0);
  return [factor, offset];
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
