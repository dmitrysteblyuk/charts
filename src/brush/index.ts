import {onDragEvents} from '../lib/drag';
import {Selection} from '../lib/selection';
import {forEach} from '../lib/utils';
import {EventEmitter} from '../lib/event-emitter';

enum Behaviour {selectNew, resizeLeft, resizeRight, move};

export class Brush {
  readonly changeEvent = new EventEmitter<{
    left: number;
    right: number;
  }>();
  readonly activeEvent = new EventEmitter<boolean>();

  private draggedBeforeClick = false;
  private width = 0;
  private height = 0;
  private left = 0;
  private right = 0;
  private reset = true;
  private fill = 'rgba(0, 0, 0, 0.3)';
  private stroke = '#444';
  private borderWidth = 10;

  setProps(props: {
    width: number;
    height: number;
    left: number;
    right: number;
  }) {
    forEach(props, (value, key) => this[key] = value);
  }

  render(container: Selection, isFirstRender: boolean) {
    const {left, right, height, width} = this;
    if (!container.getChanges({left, right, height, width})) {
      return;
    }

    container.renderOne('rect', 0, (selection, isNew) => {
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
        .attr('y', '0')
        .on('click', () => this.onResetClick());
    });

    container.renderOne('rect', 1, (selection, isNew) => {
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
        .attr('y', '0')
        .on('click', () => this.onResetClick());
    });

    container.renderOne('rect', 2, (selection, isNew) => {
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
    this.initializeEvents(container);
  }

  isReset() {
    return this.reset;
  }

  private onResetClick() {
    if (this.draggedBeforeClick || this.reset) {
      return;
    }
    this.reset = true;
    this.changeEvent.emit({
      left: 0,
      right: this.width
    });
  }

  private initializeEvents(container: Selection) {
    const limit = (x: number) => Math.max(0, Math.min(x, this.width));
    let behaviour: Behaviour | undefined;
    let startLeft = 0;
    let startRight = 0;
    let sumDiffX = 0;
    let hasMoved = false;

    onDragEvents(container, (diffX) => {
      this.draggedBeforeClick = true;
      if (diffX === 0) {
        return;
      }

      let {left, right} = this;
      if (!hasMoved) {
        hasMoved = true;
        left = startLeft;
        right = startRight;
        this.activeEvent.emit(true);
      }

      sumDiffX += diffX;

      switch (behaviour) {
        case Behaviour.selectNew:
          if (diffX > 0) {
            behaviour = Behaviour.resizeRight;
            right = limit(startRight + sumDiffX);
          } else {
            behaviour = Behaviour.resizeLeft;
            left = limit(startLeft + sumDiffX);
          }
          break;
        case Behaviour.resizeLeft:
          left = limit(startLeft + sumDiffX);
          break;
        case Behaviour.resizeRight:
          right = limit(startRight + sumDiffX);
          break;
        case Behaviour.move:
          const {width} = this;
          right = startRight + sumDiffX;
          if (right > width) {
            right = width;
            left = width + startLeft - startRight;
          } else {
            left = startLeft + sumDiffX;
          }
          if (left < 0) {
            left = 0;
            right = startRight - startLeft;
          }
          break;
      }

      if (left > right) {
        const nextLeft = right;
        right = left;
        left = nextLeft;
        const nextStartLeft = startRight;
        startRight = startLeft;
        startLeft = nextStartLeft;

        if (behaviour === Behaviour.resizeLeft) {
          behaviour = Behaviour.resizeRight;
        } else if (behaviour === Behaviour.resizeRight) {
          behaviour = Behaviour.resizeLeft;
        }
      }

      if (left === this.left && right === this.right) {
        return;
      }
      this.reset = false;
      this.changeEvent.emit({left, right});
    }, (clientX) => {
      this.draggedBeforeClick = false;
      const {left, right, borderWidth} = this;
      const startX = Math.round(clientX - container.getRect().left);
      sumDiffX = 0;

      behaviour = (
        (startX < left - borderWidth || this.reset) ? Behaviour.selectNew
          : (startX < left) ? Behaviour.resizeLeft
          : (startX < right) ? Behaviour.move
          : (startX < right + borderWidth) ? Behaviour.resizeRight
          : Behaviour.selectNew
      );

      if (behaviour === Behaviour.selectNew) {
        startLeft = startRight = limit(startX);
        return;
      }
      startLeft = left;
      startRight = right;
    }, () => {
      if (!hasMoved) {
        return;
      }
      hasMoved = false;
      this.activeEvent.emit(false);
    });
  }
}
