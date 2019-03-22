import {onZoomEvents, ZoomMode} from '../lib/zoom';
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

  render(container: Selection, isFirstRender?: boolean) {
    const {left, right, height, width, borderWidth} = this;
    if (left > 0 || right < width) {
      this.reset = false;
    }

    container.renderOne('rect', 0, (selection, isNew) => {
      selection.attr({
        'width': left,
        'height': height
      });
      if (!isNew) {
        return;
      }
      selection.on('click', () => this.onResetClick()).attr({
        'fill': defaultFill,
        'stroke': this.stroke,
        'x': '0',
        'y': '0'
      });
    });

    container.renderOne('rect', 1, (selection, isNew) => {
      selection.attr({
        'x': right,
        'width': width - right,
        'height': height
      });
      if (!isNew) {
        return;
      }
      selection.on('click', () => this.onResetClick()).attr({
        'fill': defaultFill,
        'stroke': this.stroke,
        'y': '0'
      });
    });

    container.renderOne('rect', 2, (selection) => {
      selection.attr({
        'fill': this.reset ? defaultFill : this.fill,
        'x': left,
        'width': right - left,
        'height': height,
        'y': 0
      });
    });

    container.renderOne('rect', 3, (selection) => {
      selection.attr({
        'fill': defaultFill,
        'x': left - borderWidth,
        'width': borderWidth * 2,
        'height': height,
        'y': 0
      });
    });

    container.renderOne('rect', 4, (selection) => {
      selection.attr({
        'fill': defaultFill,
        'x': right - borderWidth,
        'width': borderWidth * 2,
        'height': height,
        'y': 0
      });
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
    let hasChanged: boolean;
    let {width} = this;
    let currentX = 0;

    onZoomEvents(container, ([[nextX]], mode) => {
      if (mode !== ZoomMode.Drag) {
        return;
      }
      this.draggedBeforeClick = true;
      const diffX = nextX - currentX;
      currentX = nextX;
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
      if (!hasChanged) {
        hasChanged = true;
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
    }, ([[initialX]], mode, target) => {
      if (mode !== ZoomMode.Drag) {
        return;
      }
      currentX = initialX;
      this.draggedBeforeClick = false;
      sumDiffX = 0;
      width = this.width;
      const index = container.findIndex(target);

      behaviour = (
        this.reset ? Behaviour.selectNew
          : index === 2 ? Behaviour.move
          : index === 3 ? Behaviour.resizeLeft
          : index === 4 ? Behaviour.resizeRight
          : Behaviour.selectNew
      );

      if (behaviour === Behaviour.selectNew) {
        const startX = Math.round(initialX - container.getRect().left);
        startLeft = startRight = limit(startX);
        return;
      }

      const {left, right} = this;
      startLeft = left;
      startRight = right;
    }, () => {
      if (!hasChanged) {
        return;
      }
      hasChanged = false;
      this.activeEvent.emit(false);
    });

    function limit(x: number) {
      return Math.max(0, Math.min(x, width));
    }
  }
}
