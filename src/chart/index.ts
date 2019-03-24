import {Axis, AxisPosition} from '../axis';
import {Selection} from '../lib/selection';
import {ChartScale, getExtendedDomain} from './chart-scale';
import {forEach, newArray, groupBy} from '../lib/utils';
import {BaseSeries} from '../series';

export class Chart {
  private chartOuterWidth = 0;
  private chartOuterHeight = 0;
  private chartInnerWidth = 0;
  private chartInnerHeight = 0;
  private fixedPaddings: (number | undefined)[] = [];
  private inAction = false;
  private paddings: NumberRange = [0, 0, 0, 0];

  constructor(
    readonly axes: Axis[],
    readonly series: BaseSeries[] = []
  ) {}

  setProps(props: Partial<{
    chartOuterWidth: number,
    chartOuterHeight: number,
    inAction: boolean,
    fixedPaddings: (number | undefined)[]
  }>): this {
    forEach(props, (value, key) => value !== undefined && (this[key] = value));
    return this;
  }

  render(container: Selection) {
    const chartContainer = container.renderOne('g', 0);
    const axesContainer = chartContainer.renderOne('g', 0);
    const seriesContainer = chartContainer.renderOne('g', 1);

    this.setDomains(({xScale}) => xScale, ({extendXDomain}) => extendXDomain);
    this.setDomains(({yScale}) => yScale, ({extendYDomain}) => extendYDomain);
    this.renderAxes(axesContainer);
    this.positionContainer(chartContainer);
    this.renderSeries(seriesContainer);
  }

  getInnerWidth() {
    return this.chartInnerWidth;
  }

  getInnerHeight() {
    return this.chartInnerHeight;
  }

  getPaddings() {
    return this.paddings;
  }

  isInAction() {
    return this.inAction;
  }

  private setDomains(
    getScale: (series: BaseSeries) => ChartScale,
    getDomainExtender: (series: BaseSeries) => (
      (this: BaseSeries, domain: NumberRange) => NumberRange
    )
  ) {
    const groupsByScale = groupBy(
      this.series,
      (a, b) => getScale(a) === getScale(b)
    );
    groupsByScale.forEach(group => {
      const scale = getScale(group[0]);
      if (scale.isFixed()) {
        return;
      }
      const startDomain = (
        scale.isExtendableOnly()
          ? scale.getDomain()
          : [Infinity, -Infinity]
      );
      let domain = group.reduce((result, series) => {
        if (series.isHidden()) {
          return result;
        }
        return getDomainExtender(series).call(series, result);
      }, startDomain);

      if (domain[0] > domain[1]) {
        domain = scale.getDomain();
      }
      domain = getExtendedDomain(domain, scale.getMinDomain());

      if (!(domain[0] < domain[1])) {
        domain = [domain[0] - 1, domain[1] + 1];
      }
      scale.setDomain(domain);
    });
  }

  private renderSeries(seriesContainer: Selection) {
    seriesContainer.renderAll('g', this.series, (
      selection,
      series,
      _index
    ) => {
      this.setScaleRange(series.xScale, false);
      this.setScaleRange(series.yScale, true);
      series.render(selection);
    });
  }

  private renderAxes(axesContainer: Selection) {
    const {chartOuterWidth, chartOuterHeight, fixedPaddings} = this;
    const paddings = newArray(4, (index) => {
      const fixed = fixedPaddings[index];
      if (fixed !== undefined) {
        return fixed;
      }
      if (this.inAction) {
        return this.paddings[index];
      }
      return 0;
    });
    const that = this;
    setInnerSize();

    const containerForAxesAdjusting = axesContainer.renderOne('g',  0)
      .attr('style', 'visibility: hidden');
    containerForAxesAdjusting.renderAll('g', this.axes, (selection, axis) => {
      axis.setProps({hideOverlappingTicks: true});
      renderAxis(selection, axis);

      const size = axis.getOutsideSize();
      const position = axis.getPosition();
      if (
        fixedPaddings[position] !== undefined ||
        paddings[position] >= size
      ) {
        return;
      }
      paddings[position] = size;
    });

    setInnerSize();
    this.paddings = paddings;

    const visibleContainer = axesContainer.renderOne('g', 1);
    visibleContainer.renderAll('g', this.axes, (selection, axis) => {
      const {chartInnerWidth, chartInnerHeight} = this;

      selection.attr('transform', this.getAxisTransform(axis));

      axis.setProps({
        animated: !selection.isNew(),
        hideOverlappingTicks: false,
        gridSize: axis.isVertical() ? chartInnerWidth : chartInnerHeight
      });
      renderAxis(selection, axis);
    });

    function renderAxis(selection: Selection, axis: Axis) {
      that.setScaleRange(axis.scale, axis.isVertical());
      axis.render(selection);
    }

    function setInnerSize() {
      that.chartInnerWidth = Math.max(
        1, chartOuterWidth - paddings[1] - paddings[3]
      );
      that.chartInnerHeight = Math.max(
        1, chartOuterHeight - paddings[0] - paddings[2]
      );
    }
  }

  private setScaleRange(scale: ChartScale, vertical: boolean) {
    const {chartInnerHeight, chartInnerWidth} = this;
    scale.setRange(vertical ? [chartInnerHeight, 0] : [0, chartInnerWidth]);
  }

  private getAxisTransform(axis: Axis) {
    const position = axis.getPosition();
    const translate = (
      position === AxisPosition.right ? [this.chartInnerWidth, 0]
        : position === AxisPosition.bottom ? [0, this.chartInnerHeight]
        : undefined
    );
    return translate && `translate(${translate})`;
  }

  private positionContainer(chartContainer: Selection) {
    chartContainer.attr(
      'transform',
      `translate(${this.paddings[3]}, ${this.paddings[0]})`
    );
  }
}
