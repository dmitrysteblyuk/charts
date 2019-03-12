import {detectChanges} from '../lib/detect-changes';
import {onDrag} from '../lib/drag';
import {Selection} from '../lib/selection';

interface Props {
  width: number;
  height: number;
  left: number;
  right: number;
}

export class Brush {
  private fill = 'rgba(0, 0, 0, 0.3)';
  private stroke = '#444';

  render(parent: Selection, props: Props, isFirstRender: boolean) {
    if (!detectChanges(parent.getElement(), props)) {
      return;
    }
    const {left, right, height, width} = props;

    parent.renderOne(0, 'rect', (selection, isNew) => {
      selection
        .attr('width', left)
        .attr('height', height);
      if (!isNew) {
        return;
      }
      selection
        .attr('fill', this.fill)
        .attr('stroke', this.stroke)
        .attr('x', '0')
        .attr('y', '0');
    });

    parent.renderOne(1, 'rect', (selection, isNew) => {
      selection
        .attr('x', right)
        .attr('width', width - right)
        .attr('height', height);
      if (!isNew) {
        return;
      }
      selection
        .attr('fill', this.fill)
        .attr('stroke', this.stroke)
        .attr('y', '0');
    });

    parent.renderOne(2, 'rect', (selection, isNew) => {
      selection
        .attr('x', left)
        .attr('width', right - left)
        .attr('height', height);
      if (!isNew) {
        return;
      }
      selection
        .attr('fill', 'transparent')
        .attr('y', '0');
    });

    if (!isFirstRender) {
      return;
    }

    onDrag(parent.getElement(), (diffX, diffY) => {
      console.log('move', diffX, diffY);
    }, (startX, startY, target) => {
      console.log('start', startX, startY, target);
    });
  }
}
