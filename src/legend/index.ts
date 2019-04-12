import {Selection} from '../lib/selection';
import {AnySeries} from '../series';
import {EventEmitter} from '../lib/event-emitter';
import './index.css';

export type Legend = Readonly<ReturnType<typeof createLegend>>;

export function createLegend(seriesGroups: AnySeries[][]) {
  const clickEvent = new EventEmitter<AnySeries[]>();

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

      const displayed = group.some(({isDisplayed}) => isDisplayed());
      itemSelection.toggle(displayed);
      if (!displayed) {
        return;
      }

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
