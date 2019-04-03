import {Selection} from '../lib/selection';
import {BaseSeries} from '../series';
import {roundAuto} from '../lib/decimal-scale-ticks';
import './index.css';

export class Tooltip {
  top = 0;
  left = 0;
  time = 0;
  values: number[] = [];
  series: BaseSeries[] = [];
  hidden = true;
  lineX = 0;
  lineY1 = 0;
  lineY2 = 0;

  timeFormat = (time: number) => {
    const date = new Date(time);
    if (date.getUTCSeconds() || date.getUTCMinutes() || date.getUTCHours()) {
      return date.toUTCString();
    }
    return date.toDateString();
  };
  private timerId: number | null = null;

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

    const {top, values, lineX, lineY1, lineY2} = this;
    const tooltipContainer = container.renderOne<HTMLElement>('div', 0);

    if (tooltipContainer.isNew()) {
      tooltipContainer.attr('class', 'chart-tooltip');
    }

    tooltipContainer.renderOne<HTMLElement>('div', 0).text(
      this.timeFormat(this.time)
    );

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
      selection.renderOne<HTMLElement>('div', 0).text(
        roundAuto(value)
      );
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
