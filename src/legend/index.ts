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
      const itemSelection = container.renderOne('div', index, (selection) => {
        selection.setAttrs({
          'role': 'button',
          'class': 'legend-item'
        }).on(
          'click',
          () => clickEvent.emit(group)
        );
      });

      const color = series.getColor();
      const background = series.isHidden() ? 'none' : color;

      itemSelection.renderOne('div', 0, (selection) => selection.setAttrs({
        'class': 'legend-circle'
      })).setStyles({
        background,
        'borderColor': color
      });

      itemSelection.renderOne('div', 1, (selection) => selection.setAttrs({
        'class': 'legend-text'
      })).text(
        series.getLabel()
      );
    });
  }

  return {
    render,
    clickEvent,
    seriesGroups
  };
}
