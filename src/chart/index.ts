import {Axis, AxisPosition} from '../axis';
import {Selection} from '../lib/selection';
import {Scale} from '../lib/scale';
import {forEach, newArray, groupBy} from '../lib/utils';
import {Series} from '../series';

export class Chart {
  private outerWidth = 0;
  private outerHeight = 0;
  private innerWidth = 0;
  private innerHeight = 0;
  private forcedPaddings: (number | undefined)[] = [];
  private paddings: number[] = [0, 0, 0, 0];

  constructor(
    readonly axes: Axis[],
    readonly grids: Axis[] = [],
    readonly series: Series[] = []
  ) {}

  setProps(props: {
    outerWidth: number,
    outerHeight: number,
    forcedPaddings?: (number | undefined)[]
  }) {
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
    return this.innerWidth;
  }

  getInnerHeight() {
    return this.innerHeight;
  }

  getPaddings() {
    return this.paddings;
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
        tickSize: -(grid.isVertical() ? this.innerWidth : this.innerHeight)
      });
      grid.render(selection);
    });
  }

  private renderAxes(axesContainer: Selection) {
    const {outerWidth, outerHeight, forcedPaddings} = this;
    const paddings = newArray(4, (index) => forcedPaddings[index] || 0);
    let innerWidth = outerWidth - paddings[1] - paddings[3];
    let innerHeight = outerHeight - paddings[0] - paddings[2];
    let shouldRerender = false;

    axesContainer.renderAll('g', this.axes, (selection, axis) => {
      renderAxis(selection, axis);

      const size = axis.getSize();
      const position = axis.getPosition();
      if (
        forcedPaddings[position] !== undefined ||
        paddings[position] >= size
      ) {
        return;
      }
      paddings[position] = size;
      shouldRerender = true;
    });

    this.paddings = paddings;
    this.innerWidth = innerWidth = outerWidth - paddings[1] - paddings[3];
    this.innerHeight = innerHeight = outerHeight - paddings[0] - paddings[2];

    axesContainer.renderAll('g', this.axes, (selection, axis) => {
      selection.attr('transform', this.getAxisTransform(axis));
      if (!shouldRerender) {
        return;
      }
      renderAxis(selection, axis);
    });

    function renderAxis(selection: Selection, axis: Axis) {
      axis.scale.setRange(
        axis.isVertical() ? [innerHeight, 0] : [0, innerWidth]
      );
      axis.render(selection);
    }
  }

  private getAxisTransform(
    axis: Axis,
    horizontalOffset = this.innerWidth,
    verticalOffset = this.innerHeight
  ) {
    const position = axis.getPosition();
    const translate = (
      position === AxisPosition.right ? [horizontalOffset, 0]
        : position === AxisPosition.bottom ? [0, verticalOffset]
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
