import {Selection} from '../lib/selection';
import {AnySeries} from '../series';
import {EventEmitter} from '../lib/event-emitter';
import './index.css';

export type Legend = Readonly<ReturnType<typeof createLegend>>;

export function createLegend() {
  let seriesGroups: AnySeries[][] = [];
  const clickEvent = new EventEmitter<AnySeries[]>();

  function render(container: Selection) {
    const displayed = seriesGroups.map(
      (group) => group.some(({isDisplayed}) => isDisplayed())
    );
    const countDisplayed = displayed.reduce((a, b) => a + +b, 0);

    seriesGroups.forEach((group, index) => {
      const [series] = group;
      const itemSelection = container.renderOne('div', index, (selection) => {
        selection.setAttrs({
          'role': 'button',
          'class': 'legend-item'
        }).setStyles({
          'display': 'none',
          'background': series.getColor()
        }).on(
          'click',
          () => clickEvent.emit(seriesGroups[index])
        );
      });

      const toDisplay = countDisplayed > 1 && displayed[index];
      itemSelection.toggle(toDisplay);

      if (!toDisplay) {
        return;
      }

      itemSelection.renderOne('div', 0, (selection) => selection.setAttrs({
        'class': 'legend-circle'
      })).toggle(
        !series.isHidden(),
        ['hide-check', 'show-check']
      );

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
    getSeriesGroups: () => seriesGroups,
    setSeriesGrousp: (_: typeof seriesGroups) => (seriesGroups = _)
  };
}
