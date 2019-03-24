import {Selection} from '../lib/selection';
import {forEach} from '../lib/utils';
import {ChartScale, getExtendedDomain} from '../chart/chart-scale';
import {SeriesData} from '../lib/series-data';
import {binarySearch} from '../lib/binary-search';

export interface SeriesProps {
  color: string;
  label: string;
  enableTransitions?: boolean;
  hidden?: boolean;
}

export abstract class BaseSeries {
  protected color = '';
  protected label = '';
  protected hidden = false;
  protected enableTransitions = true;

  constructor(
    readonly xScale: ChartScale,
    readonly yScale: ChartScale,
    readonly data: SeriesData
  ) {}

  setProps(props: Partial<SeriesProps>): this {
    forEach(props, (value, key) => value !== undefined && (this[key] = value));
    return this;
  }

  getColor() {
    return this.color;
  }

  getLabel() {
    return this.label;
  }

  isHidden() {
    return this.hidden;
  }

  abstract render(container: Selection): void;

  extendXDomain(xDomain: NumberRange): NumberRange {
    const x = this.data.x;
    if (!x.length) {
      return xDomain;
    }
    return getExtendedDomain(xDomain, [x[0], x[x.length - 1]]);
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
      if (minY > y[index]) {
        minY = y[index];
      }
      if (maxY < y[index]) {
        maxY = y[index];
      }
    }
    return getExtendedDomain(yDomain, [minY, maxY]);
  }
}
