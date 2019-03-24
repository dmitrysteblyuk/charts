import {Selection} from '../lib/selection';
import {forEach, memoizeOne} from '../lib/utils';
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
    private data: SeriesData
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

  getData() {
    return this.data;
  }

  setData(data: SeriesData) {
    this.data = data;
    this.getYDomain.clearCache();
  }

  abstract render(container: Selection): void;

  extendXDomain(xDomain: NumberRange): NumberRange {
    const {x: dataX, size} = this.data;
    if (!dataX.length) {
      return xDomain;
    }
    return getExtendedDomain(xDomain, [dataX[0], dataX[size - 1]]);
  }

  extendYDomain(yDomain: NumberRange): NumberRange {
    const {x: dataX, size} = this.data;
    if (!size) {
      return yDomain;
    }
    const xDomain = this.xScale.getDomain();
    const startIndex = Math.max(
      0,
      binarySearch(0, size, (index) => xDomain[0] < dataX[index]) - 1
    );
    const endIndex = Math.min(
      size,
      binarySearch(startIndex, size, (index) => xDomain[1] <= dataX[index]) + 1
    );

    this.prepareData();

    const [minY, maxY] = this.getYDomain(startIndex, endIndex, this.data);
    return getExtendedDomain(yDomain, [minY, maxY]);
  }

  private getYDomain = memoizeOne((
    startIndex: number,
    endIndex: number,
    data: SeriesData
  ) => {
    return data.getRange(
      startIndex + 1,
      endIndex,
      startIndex,
      startIndex
    ).map((index) => data.y[index])
  });

  private prepareData() {
    const [start, end] = this.xScale.getRange();
    const pixels = Math.max(300, Math.min(Math.abs(end - start), 2000));
    this.data.splitToClusters(pixels);
  }
}
