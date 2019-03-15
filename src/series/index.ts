import {Selection} from '../lib/selection';
import {forEach} from '../lib/utils';
import {Scale} from '../lib/scale';
import {SeriesData} from '../lib/series-data';
import {binarySearch} from '../lib/binary-search';

export abstract class Series {
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

  extendXDomain(xDomain: number[]) {
    const x = this.data.x;
    if (!x.length) {
      return xDomain;
    }
    return [
      Math.min(xDomain[0], x[0]),
      Math.max(xDomain[1], x[x.length - 1])
    ];
  }

  extendYDomain(yDomain: number[]) {
    const {x, y, size} = this.data;
    if (!size) {
      return yDomain;
    }
    const xDomain = this.xScale.getDomain();
    const startIndex = (
      binarySearch(0, size, (index) => xDomain[0] <= x[index])
    );
    const endIndex = (
      binarySearch(startIndex, size, (index) => xDomain[1] < x[index])
    );

    let [minY, maxY] = yDomain;
    for (let index = startIndex; index < endIndex; index++) {
      minY = Math.min(minY, y[index]);
      maxY = Math.max(maxY, y[index]);
    }
    return [minY, maxY];
  }
}
