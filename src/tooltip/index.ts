import {Selection} from '../lib/selection';
import {forEach} from '../lib/utils';
import {BaseSeries} from '../series';
import './index.css';

export class Tooltip {
  private top = 0;
  private left = 0;
  private time = 0;
  private values: number[] = [];
  private series: BaseSeries[] = [];
  private hidden = true;
  private timerId: number | null = null;
  private lineX = 0;
  private lineY1 = 0;
  private lineY2 = 0;

  setProps(props: Partial<{
    top: number,
    left: number,
    time: number,
    values: number[],
    series: BaseSeries[],
    hidden: boolean,
    lineX: number,
    lineY1: number,
    lineY2: number
  }>): this {
    forEach(props, (value, key) => value !== undefined && (this[key] = value));
    return this;
  }

  render(
    container: Selection<HTMLElement>,
    lineContainer: Selection
  ) {
    const {hidden} = this;
    if (container.getDataChanges({hidden})) {
      container.attr('class', hidden ? 'fade' : 'appear');
      lineContainer.attr('class', hidden ? 'fade' : 'appear');

      if (hidden) {
        this.timerId = setTimeout(() => {
          container.setStyles({'display': 'none'});
          lineContainer.attr('styles', 'display: none');
          this.timerId = null;
        }, 500);
        return;
      }

      if (this.timerId !== null) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
      container.setStyles({'display': null});
      lineContainer.attr('styles', undefined);
    }

    if (hidden) {
      return;
    }

    const {top, time, values, lineX, lineY1, lineY2} = this;
    const tooltipContainer = container.renderOne<HTMLElement>('div', 0);

    if (tooltipContainer.isNew()) {
      tooltipContainer.attr('class', 'chart-tooltip');
    }

    tooltipContainer.renderOne<HTMLElement>('div', 0)
      .text(new Date(time).toLocaleString());

    const valueSelection = tooltipContainer.renderOne<HTMLElement>('div', 1);
    if (valueSelection.isNew()) {
      valueSelection.attr('class', 'chart-tooltip-values');
    }
    valueSelection.renderAll<HTMLElement, number>('div', values, (
      selection,
      value,
      index
    ) => {
      const series = this.series[index];
      selection.setStyles({'color': series.getColor()});
      selection.renderOne<HTMLElement>('div', 0).text(value);
      selection.renderOne('div', 1).text(series.getLabel());
    });

    const rect = tooltipContainer.getRect();
    const lineSelection = lineContainer.renderOne('line', 0);
    const circlesContainer = lineContainer.renderOne('g', 1);
    lineSelection.attr({
      'x1': lineX,
      'x2': lineX,
      'y1': Math.min(lineY1 + rect.height, lineY2),
      'y2': lineY2,
      'stroke': '#ddd'
    });

    circlesContainer.renderAll('circle', values, (selection, value, index) => {
      const series = this.series[index];
      selection.attr({
        'stroke': series.getColor(),
        'fill': 'white',
        'stroke-width': 2,
        'r': 5,
        'cx': lineX,
        'cy': series.yScale.scale(value)
      });
    });

    const left = Math.min(this.left, window.innerWidth - rect.width - 5);
    tooltipContainer.setStyles({
      'top': `${top}px`,
      'left': `${left}px`
    });
  }
}
