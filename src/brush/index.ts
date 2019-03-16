import {onDragEvents} from '../lib/drag';
import {Selection} from '../lib/selection';
import {forEach, roundRange} from '../lib/utils';
import {EventEmitter} from '../lib/event-emitter';

const enum Behaviour {selectNew, resizeLeft, resizeRight, move};
const defaultFill = 'transparent';

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
    if (left > 0 || right < width) {
      this.reset = false;
    }

    container.renderOne('rect', 0, (selection, isNew) => {
      selection
        .attr('width', left)
        .attr('height', height);
      if (!isNew) {
        return;
      }
      selection
        .attr('fill', defaultFill)
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
        .attr('fill', defaultFill)
        .attr('stroke', this.stroke)
        .attr('y', '0')
        .on('click', () => this.onResetClick());
    });

    container.renderOne('rect', 2, (selection, isNew) => {
      selection
        .attr('fill', this.reset ? defaultFill : this.fill)
        .attr('x', left)
        .attr('width', right - left)
        .attr('height', height);
      if (!isNew) {
        return;
      }
      selection
        .attr('y', '0');
    });

    if (!isFirstRender) {
      return;
    }
    this.initializeDragEvents(container);
  }

  isReset() {
    return this.reset;
  }

  getWidth() {
    return this.width;
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

  private initializeDragEvents(container: Selection) {
    let behaviour: Behaviour | undefined;
    let startLeft = 0;
    let startRight = 0;
    let sumDiffX = 0;
    let hasMoved = false;
    let {width} = this;

    onDragEvents(container, (diffX) => {
      this.draggedBeforeClick = true;
      if (diffX === 0) {
        return;
      }

      if (width !== this.width) {
        const factor = this.width / width;
        width = this.width;
        sumDiffX = Math.round(sumDiffX * factor);
        [startLeft, startRight] = (
          roundRange(startLeft * factor, startRight * factor)
        );
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
      width = this.width;
      const innerBorderWidth = Math.min(
        borderWidth, Math.round((right - left) / 4)
      );
      const leftBorderWidth = Math.min(borderWidth, Math.ceil(left / 2));
      const rightBorderWidth = Math.min(
        borderWidth, Math.ceil((width - right) / 2)
      );

      behaviour = (
        (startX < left - leftBorderWidth || this.reset) ? Behaviour.selectNew
          : (startX < left + innerBorderWidth) ? Behaviour.resizeLeft
          : (startX < right - innerBorderWidth) ? Behaviour.move
          : (startX < right + rightBorderWidth) ? Behaviour.resizeRight
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

    function limit(x: number) {
      return Math.max(0, Math.min(x, width));
    }
  }
}
