import {Axis, AxisPosition} from '../axis';
import {Selection} from '../lib/selection';
import {ChartScale, getExtendedDomain} from './chart-scale';
import {groupBy, setProps} from '../lib/utils';
import {BaseSeries} from '../series';

export class Chart {
  chartOuterWidth = 0;
  chartOuterHeight = 0;
  paddings: NumberRange = [0, 0, 0, 0];

  private chartInnerWidth = 0;
  private chartInnerHeight = 0;

  constructor(
    readonly axes: Axis[],
    readonly series: BaseSeries[] = []
  ) {}

  render(container: Selection) {
    const chartContainer = container.renderOne('g', 0);
    const axesContainer = chartContainer.renderOne('g', 0);
    const seriesContainer = chartContainer.renderOne('g', 1);

    this.setDomains(({xScale}) => xScale, ({extendXDomain}) => extendXDomain);
    this.setDomains(({yScale}) => yScale, ({extendYDomain}) => extendYDomain);
    this.renderAxes(axesContainer);
    this.alignContainer(chartContainer);
    this.renderSeries(seriesContainer);
  }

  getInnerWidth() {
    return this.chartInnerWidth;
  }

  getInnerHeight() {
    return this.chartInnerHeight;
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
    const {chartOuterWidth, chartOuterHeight, paddings} = this;
    this.chartInnerWidth = Math.max(
      1, chartOuterWidth - paddings[1] - paddings[3]
    );
    this.chartInnerHeight = Math.max(
      1, chartOuterHeight - paddings[0] - paddings[2]
    );

    const adjustAxes = this.axes.filter((axis) => {
      this.setScaleRange(axis.scale, axis.isVertical());

      if (axis.isVertical()) {
        axis.tickData = null;
        return false;
      }
      return true;
    });

    const containerForAxesAdjusting = axesContainer.renderOne('g',  0)
      .attr('style', 'visibility: hidden');
    containerForAxesAdjusting.renderAll('g', adjustAxes, (selection, axis) => {
      setProps(axis, {hideOverlappingTicks: true});
      axis.render(selection);
    });

    const visibleAxesContainer = axesContainer.renderOne('g',  1);
    visibleAxesContainer.renderAll('g', this.axes, (selection, axis) => {
      selection.attr('transform', this.getAxisTransform(axis));

      setProps(axis, {
        animated: !selection.isNew(),
        hideOverlappingTicks: false,
        gridSize: (
          axis.isVertical()
            ? this.chartInnerWidth
            : this.chartInnerHeight
        )
      }).render(
        selection
      );
    });
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

  private alignContainer(chartContainer: Selection) {
    chartContainer.attr(
      'transform',
      `translate(${this.paddings[3]}, ${this.paddings[0]})`
    );
  }
}
