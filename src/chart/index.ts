import {Axis, AxisPosition} from '../axis';
import {Selection} from '../lib/selection';
import {Scale} from '../lib/scale';
import {forEach, newArray, groupBy} from '../lib/utils';
import {Series} from '../series';

export class Chart {
  private chartOuterWidth = 0;
  private chartOuterHeight = 0;
  private chartInnerWidth = 0;
  private chartInnerHeight = 0;
  private fixedPaddings: (number | undefined)[] = [];
  private inAction = false;
  private paddings: number[] = [0, 0, 0, 0];

  constructor(
    readonly axes: Axis[],
    readonly grids: Axis[] = [],
    readonly series: Series[] = []
  ) {}

  setProps(props: Partial<{
    chartOuterWidth: number,
    chartOuterHeight: number,
    inAction: boolean,
    fixedPaddings: (number | undefined)[]
  }>) {
    forEach(props, (value, key) => value !== undefined && (this[key] = value));
  }

  render(container: Selection) {
    const chartContainer = container.renderOne('g', 0);
    const gridsContainer = chartContainer.renderOne('g', 0);
    const axesContainer = chartContainer.renderOne('g', 1);
    const seriesContainer = chartContainer.renderOne('g', 2);

    this.setDomains(({xScale}) => xScale, ({extendXDomain}) => extendXDomain);
    this.setDomains(({yScale}) => yScale, ({extendYDomain}) => extendYDomain);
    this.renderAxes(axesContainer);
    this.positionContainer(chartContainer);
    this.renderGrids(gridsContainer);
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
    getScale: (series: Series) => Scale,
    getDomainExtender: (
      (series: Series) => (this: Series, domain: number[]) => number[]
    )
  ) {
    const groupsByScale = (
      groupBy(this.series, (a, b) => getScale(a) === getScale(b))
    );
    groupsByScale.forEach(group => {
      const scale = getScale(group[0]);
      if (scale.isFixed()) {
        return;
      }
      const domain = group.reduce(
        (result, series) => getDomainExtender(series).call(series, result),
        [Infinity, -Infinity]
      );

      if (domain[0] > domain[1]) {
        return;
      }
      if (!(domain[0] < domain[1])) {
        domain[0] -= 1;
        domain[1] += 1;
      }
      scale.setDomain(domain);
    });
  }

  private renderSeries(seriesContainer: Selection) {
    seriesContainer.renderAll('g', this.series, (selection, series, isNew) => {
      series.render(selection, isNew);
    });
  }

  private renderGrids(gridsContainer: Selection) {
    gridsContainer.renderAll('g', this.grids, (selection, grid) => {
      selection.attr('transform', this.getAxisTransform(grid));
      grid.setProps({
        tickSize: -(
          grid.isVertical() ? this.chartInnerWidth : this.chartInnerHeight
        )
      });
      grid.render(selection);
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
    let chartInnerWidth = chartOuterWidth - paddings[1] - paddings[3];
    let chartInnerHeight = chartOuterHeight - paddings[0] - paddings[2];
    let shouldRerender = false;

    axesContainer.renderAll('g', this.axes, (selection, axis) => {
      renderAxis(selection, axis);

      const size = axis.getSize();
      const position = axis.getPosition();
      if (
        fixedPaddings[position] !== undefined ||
        paddings[position] >= size
      ) {
        return;
      }
      paddings[position] = size;
      shouldRerender = true;
    });

    chartInnerWidth = chartOuterWidth - paddings[1] - paddings[3];
    chartInnerHeight = chartOuterHeight - paddings[0] - paddings[2];

    this.paddings = paddings;
    this.chartInnerWidth = chartInnerWidth;
    this.chartInnerHeight = chartInnerHeight;

    axesContainer.renderAll('g', this.axes, (selection, axis) => {
      selection.attr('transform', this.getAxisTransform(axis));
      if (!shouldRerender) {
        return;
      }
      renderAxis(selection, axis);
    });

    function renderAxis(selection: Selection, axis: Axis) {
      axis.scale.setRange(
        axis.isVertical() ? [chartInnerHeight, 0] : [0, chartInnerWidth]
      );
      axis.render(selection);
    }
  }

  private getAxisTransform(axis: Axis) {
    const position = axis.getPosition();
    const translate = (
      position === AxisPosition.right ? [this.chartInnerWidth, 0]
        : position === AxisPosition.bottom ? [0, this.chartInnerHeight]
        : null
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
