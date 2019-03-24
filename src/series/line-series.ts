import {Selection} from '../lib/selection';
import {binarySearch} from '../lib/binary-search';
import {Scale} from '../lib/scale';
import {memoizeOne} from '../lib/utils';
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

      const [x0, x1] = xScale.getDomain();
      let startIndex = binarySearch(
        0,
        data.size,
        (index) => x0 < data.x[index]
      ) - 1;
      let endIndex = binarySearch(
        startIndex + 1,
        data.size,
        (index) => x1 <= data.x[index]
      ) + 1;
      startIndex = Math.max(0, startIndex);
      endIndex = Math.min(data.size, endIndex);

      const line = this.drawLine(
        data,
        startIndex,
        endIndex,
        xScale.getFactor(),
        xScale.getOffset(),
        yScale.getFactor(),
        yScale.getOffset()
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

  private getPoints = memoizeOne(getPoints);

  private drawLine = memoizeOne((
    data: SeriesData,
    startIndex: number,
    endIndex: number,
    factorX: number,
    ...[]: number[]
  ) => {
    const {xScale, yScale} = this;
    return drawLine(
      (x) => Math.floor(xScale.scale(x)),
      (y) => Math.round(yScale.scale(y)),
      data,
      this.getPoints(data, startIndex, endIndex, factorX)
    );
  });
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
  points: ReadonlyArray<number>
): string {
  let lastX = scaleX(data.x[points[0]]);
  let lastY = scaleY(data.y[points[0]]);
  const path = ['M', lastX, ',', lastY];

  for (let index = 1; index < points.length; index++) {
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

function getPoints(
  data: SeriesData,
  startIndex: number,
  endIndex: number,
  factorX: number
): ReadonlyArray<number> {
  if (startIndex >= endIndex) {
    return [];
  }
  const points: number[] = [];
  let last = -1;
  rangePoints(data, startIndex, endIndex, factorX, (index) => {
    if (last === index) {
      return;
    }
    points.push(index);
    last = index;
  });
  return points;
}

function rangePoints(
  data: SeriesData,
  startIndex: number,
  endIndex: number,
  factorX: number,
  addNext: (index: number) => void
) {
  let lastX = Math.floor(factorX * data.x[startIndex]);
  let connect = (
    startIndex === 0 ||
    lastX > Math.floor(factorX * data.x[startIndex - 1]) + 1
  );

  for (let index = startIndex; index < endIndex; index++) {
    if (connect) {
      addNext(index);
    }

    let toIndex: number | undefined;
    if (index === endIndex - 1) {
      toIndex = endIndex;
    } else {
      const dataX = Math.ceil((lastX + 1) / factorX);
      toIndex = binarySearch(
        index + 1,
        endIndex,
        (searchIndex) => dataX <= data.x[searchIndex]
      );
    }

    const range = data.getRange(
      index + 1,
      toIndex,
      index,
      index
    );

    if (range[0] < range[1]) {
      addNext(range[0]);
      addNext(range[1]);
    } else {
      addNext(range[1]);
      addNext(range[0]);
    }

    index = toIndex - 1;
    if (index === data.size - 1) {
      connect = true;
    } else {
      const prevX = lastX;
      lastX = Math.floor(factorX * data.x[index + 1]);
      connect = lastX > prevX + 1;
    }

    if (connect) {
      addNext(index);
    }
  }
}
