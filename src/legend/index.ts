import {Selection} from '../lib/selection';
import {BaseSeries} from '../series';
import {EventEmitter} from '../lib/event-emitter';
import './index.css';

export type Legend = ReturnType<typeof createLegend>;

export function createLegend(seriesGroups: BaseSeries[][]) {
  const clickEvent = new EventEmitter<BaseSeries[]>();

  function render(container: Selection) {
    seriesGroups.forEach((group, index) => {
      const [series] = group;
      const itemSelection = container.renderOne('div', index, {
        'role': 'button',
        'class': 'legend-item'
      });

      const color = series.getColor();
      const background = series.isHidden() ? 'none' : color;

      itemSelection.renderOne('div', 0, {
        'class': 'legend-circle'
      }).setStyles({
        background,
        'borderColor': color
      });

      itemSelection.renderOne('div', 1, {
        'class': 'legend-text'
      }).text(
        series.getLabel()
      );

      if (!itemSelection.isNew()) {
        return;
      }
      itemSelection.on('click', () => clickEvent.emit(group));
    });
  }

  return {
    render,
    clickEvent,
    seriesGroups
  };
}
