import {Selection} from '../lib/selection';
import {forEach} from '../lib/utils';
import {Scale} from '../lib/scale';
import {SeriesData} from '../lib/series-data';
import {binarySearch} from '../lib/binary-search';

export abstract class BaseSeries {
  protected color = 'steelblue';

  constructor(
    readonly xScale: Scale,
    readonly yScale: Scale,
    protected data: SeriesData
  ) {}

  setProps(props: {}) {
    forEach(props, (value, key) => value !== undefined && (this[key] = value));
  }

  abstract render(container: Selection, isFirstRender: boolean): void;

  extendXDomain(xDomain: NumberRange): NumberRange {
    const x = this.data.x;
    if (!x.length) {
      return xDomain;
    }
    return [
      Math.min(xDomain[0], x[0]),
      Math.max(xDomain[1], x[x.length - 1])
    ];
  }

  extendYDomain(yDomain: NumberRange): NumberRange {
    const {x, y, size} = this.data;
    if (!size) {
      return yDomain;
    }
    const xDomain = this.xScale.getDomain();
    const startIndex = Math.max(
      0,
      binarySearch(0, size, (index) => xDomain[0] < x[index]) - 1
    );
    const endIndex = Math.min(
      size,
      binarySearch(startIndex, size, (index) => xDomain[1] <= x[index]) + 1
    );

    let [minY, maxY] = yDomain;
    for (let index = startIndex; index < endIndex; index++) {
      minY = Math.min(minY, y[index]);
      maxY = Math.max(maxY, y[index]);
    }
    return [minY, maxY];
  }
}
