import {Selection} from '../lib/selection';
import {newArray} from '../lib/utils';
import {Scale} from '../lib/scale';
import {SeriesData} from '../lib/series-data';
import {BaseSeries} from './index';

export class LineSeries extends BaseSeries {
  private readonly transitionYScale = new Scale();

  render(container: Selection) {
    const {data, xScale, yScale, color} = this;

    container.renderOne('path', 0, (selection) => {
      if (!data.size) {
        selection.attr('d', 'M-1,-1');
        return;
      }
      const {transitionYScale} = this;
      transitionYScale.setRange(yScale.getRange());

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
        const [
          yFactor,
          yOffset
        ] = getTransform(transitionYScale, yScale, fromYDomain, progress);
        return `scale(1,${yFactor})translate(0,${yOffset})`;
      });
    }, this.hidden);
  }
}

function getTransform(
  transitionScale: Scale,
  scale: Scale,
  fromDomain: NumberRange,
  progress: number
) {
  const domain = scale.getDomain();
  transitionScale.setDomain([
    fromDomain[0] + (domain[0] - fromDomain[0]) * progress,
    fromDomain[1] + (domain[1] - fromDomain[1]) * progress
  ]);
  const factor = transitionScale.getFactor() / scale.getFactor();
  const offset = transitionScale.getOffset() - scale.getOffset();
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
