import {Selection} from '../lib/selection';
import {forEach, isPositive} from '../lib/utils';
import {BaseSeries} from '../series';
import {EventEmitter} from '../lib/event-emitter';

export class Legend {
  private maxWidth = 0;
  private size = 0;
  readonly onClickEvent = new EventEmitter<BaseSeries[]>();

  constructor(readonly seriesGroups: BaseSeries[][]) {}

  setProps(props: {
    maxWidth?: number
  }): this {
    forEach(props, (value, key) => value !== undefined && (this[key] = value));
    return this;
  }

  getSize() {
    return this.size;
  }

  render(container: Selection) {
    const {seriesGroups, maxWidth} = this;

    container.renderAll('g', seriesGroups, (itemSelection, group, isNew) => {
      const [series] = group;
      itemSelection.renderOne('circle', 0, (selection) => {
        selection.attr({
          'cx': 12,
          'cy': 12,
          'r': 10,
          'stroke': series.getColor(),
          'stroke-width': 3,
          'fill': series.isHidden() ? 'transparent' : series.getColor()
        });
      });

      itemSelection.renderOne('text', 1, (selection) => {
        selection.text(series.getLabel()).attr({
          'dx': 33,
          'dy': 12.5,
          'dominant-baseline': 'middle'
        });
      });

      if (!isNew) {
        return;
      }
      itemSelection.on('click', () => {
        this.onClickEvent.emit(group);
      });
    });

    const rects: Rect[] = [];
    let maxItemSize = 0;
    container.updateAll((selection) => {
      const rect = selection.getRoundedRect();
      rect.height += 4;
      if (rect.width > maxItemSize) {
        maxItemSize = rect.width;
      }
      rects.push(rect);
    });

    const columnSize = maxItemSize + 10;
    const totalColumns = Math.max(1, Math.floor(maxWidth / columnSize));

    if (!isPositive(totalColumns)) {
      this.size = 0;
      return;
    }

    const rowOffsets = rects.reduce<number[]>((offsets, rect, index) => {
      const row = Math.floor(index / totalColumns) + 1;
      if (row >= offsets.length) {
        offsets.push(0);
      }
      offsets[row] = Math.max(offsets[row], offsets[row - 1] + rect.height);
      return offsets;
    }, [0]);

    let itemIndex = 0;
    container.updateAll((selection) => {
      const x = itemIndex % totalColumns * columnSize;
      const y = rowOffsets[Math.floor(itemIndex / totalColumns)];
      selection.attr('transform', `translate(${x},${y})`);
      itemIndex++;
    });

    this.size = rowOffsets[rowOffsets.length - 1];
  }
}
