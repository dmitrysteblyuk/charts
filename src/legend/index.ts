import {Selection} from '../lib/selection';
import {isPositive} from '../lib/utils';
import {BaseSeries} from '../series';
import {EventEmitter} from '../lib/event-emitter';

export class Legend {
  maxWidth = 0;
  radius = 7;
  strokeWidth = 3;
  rectPadding = 7;

  private size = 0;
  readonly onClickEvent = new EventEmitter<BaseSeries[]>();

  constructor(readonly seriesGroups: BaseSeries[][]) {}

  getSize() {
    return this.size;
  }

  getPadding() {
    return this.rectPadding;
  }

  render(container: Selection) {
    const {seriesGroups, maxWidth, radius, strokeWidth, rectPadding} = this;

    container.renderAll('g', seriesGroups, (itemSelection, group) => {
      const [series] = group;
      const circleSelection = itemSelection.renderOne('circle', 0);
      if (circleSelection.isNew()) {
        const center = radius + strokeWidth / 2;
        circleSelection.attr({
          'cx': center,
          'cy': center,
          'r': radius,
          'stroke-width': strokeWidth
        });
      }
      circleSelection.attr({
        'stroke': series.getColor(),
        'fill': series.isHidden() ? 'transparent' : series.getColor()
      });

      const textSelection = itemSelection.renderOne('text', 1);
      textSelection.text(series.getLabel());
      const dx = 2 * radius + strokeWidth + 10;
      if (textSelection.isNew()) {
        textSelection.attr({
          'dx': dx,
          'dy': radius + strokeWidth,
          'dominant-baseline': 'middle'
        });
      }

      const rectSelection = itemSelection.renderOne('rect', 2);
      if (rectSelection.isNew()) {
        rectSelection.attr({
          'x': -rectPadding,
          'y': -rectPadding,
          'fill': 'transparent',
          'stroke': '#ddd'
        });
      }
      const textRect = textSelection.getRoundedRect();
      const height = (
        Math.max(textRect.height, 2 * radius + strokeWidth) +
        2 * rectPadding
      );
      const width = dx + textRect.width + 3 * rectPadding;
      rectSelection.attr({
        'rx': height / 2,
        'ry': height / 2,
        'width': width,
        'height': height
      });

      if (!itemSelection.isNew()) {
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
      if (rect.width > maxItemSize) {
        maxItemSize = rect.width;
      }
      rects.push(rect);
    });

    const columnSize = maxItemSize + 15;
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
      offsets[row] = Math.max(
        offsets[row],
        offsets[row - 1] + rect.height + 4
      );
      return offsets;
    }, [0]);

    container.updateAll((selection, _group, index) => {
      const x = index % totalColumns * columnSize;
      const y = rowOffsets[Math.floor(index / totalColumns)];
      selection.attr('transform', `translate(${x},${y})`);
      index++;
    });

    this.size = rowOffsets[rowOffsets.length - 1];
  }
}
