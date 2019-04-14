import {onZoomEvents, ZoomMode} from '../lib/zoom';
import {Selection} from '../lib/selection';
import {roundRange} from '../lib/utils';
import {EventEmitter} from '../lib/event-emitter';

const enum Behaviour {resizeLeft, resizeRight, move};
const color = 'rgba(0, 25, 100, 0.1)';

export type Brush = Readonly<ReturnType<typeof createBrush>>;

export function createBrush(height: number) {
  const changeEvent = new EventEmitter<{
    left: number;
    right: number;
  }>();

  let width = 0;
  let left = 0;
  let right = 0;
  let brushing = false;
  const borderWidth = 10;

  function render(container: Selection) {
    let isNew: boolean | undefined;
    const common = {
      'fill': 'transparent',
      'y': 0,
      'height': height
    };

    container.renderOne('rect', 0, (selection) => {
      selection.setAttrs({
        ...common,
        'fill': color,
        'x': '0'
      });
      isNew = true;
    }).setAttrs({
      'width': left
    });

    container.renderOne('rect', 1, (selection) => {
      selection.setAttrs({
        ...common,
        'fill': color
      });
    }).setAttrs({
      'x': right,
      'width': width - right
    });

    const centerRect = container.renderOne('rect', 2, (selection) => {
      selection.setAttrs(common);
    }).setAttrs({
      'x': left,
      'width': right - left
    });

    const leftHandle = container.renderOne('rect', 3, (selection) => {
      selection.setAttrs(common);
    }).setAttrs({
      'x': left - borderWidth,
      'width': borderWidth * 2
    });

    const rightHandle = container.renderOne('rect', 4, (selection) => {
      selection.setAttrs(common);
    }).setAttrs({
      'x': right - borderWidth,
      'width': borderWidth * 2
    });

    if (!isNew) {
      return;
    }
    bindDragEvents(
      container,
      centerRect,
      leftHandle,
      rightHandle
    );
  }

  function bindDragEvents(
    container: Selection,
    centerRect: Selection,
    leftHandle: Selection,
    rightHandle: Selection
  ) {
    let behaviour: Behaviour | null = null;
    let startLeft = 0;
    let startRight = 0;
    let sumDiffX = 0;
    let currentX = 0;
    let currentWidth = width;

    onZoomEvents(container, ([[nextX]], mode) => {
      if (behaviour === null || mode !== ZoomMode.Drag) {
        return;
      }
      const diffX = nextX - currentX;
      currentX = nextX;
      if (diffX === 0) {
        return;
      }

      if (currentWidth !== width) {
        const factor = currentWidth / width;
        currentWidth = width;
        sumDiffX = Math.round(sumDiffX * factor);
        [startLeft, startRight] = (
          roundRange(startLeft * factor, startRight * factor)
        );
      }
      let nextLeft = left;
      let nextRight = right;

      if (!brushing) {
        brushing = true;
        nextLeft = startLeft;
        nextRight = startRight;
      }

      sumDiffX += diffX;

      switch (behaviour) {
        case Behaviour.resizeLeft:
          nextLeft = limit(startLeft + sumDiffX);
          break;
        case Behaviour.resizeRight:
          nextRight = limit(startRight + sumDiffX);
          break;
        case Behaviour.move:
          nextRight = startRight + sumDiffX;
          if (nextRight > currentWidth) {
            nextRight = currentWidth;
            nextLeft = currentWidth + startLeft - startRight;
          } else {
            nextLeft = startLeft + sumDiffX;
          }
          if (nextLeft < 0) {
            nextLeft = 0;
            nextRight = startRight - startLeft;
          }
          break;
      }

      if (nextLeft > nextRight) {
        nextRight = nextLeft + (nextLeft = nextRight, 0);
        const nextStartLeft = startRight;
        startRight = startLeft;
        startLeft = nextStartLeft;

        if (behaviour === Behaviour.resizeLeft) {
          behaviour = Behaviour.resizeRight;
        } else if (behaviour === Behaviour.resizeRight) {
          behaviour = Behaviour.resizeLeft;
        }
      }

      if (nextLeft === left && nextRight === right) {
        return;
      }

      left = nextLeft;
      right = nextRight;

      changeEvent.emit({left, right});
    }, ([[initialX]], mode, {target}: {target: any}) => {
      if (mode !== ZoomMode.Drag) {
        return;
      }
      currentX = initialX;
      sumDiffX = 0;
      currentWidth = width;
      startLeft = left;
      startRight = right;

      behaviour = (
        centerRect.isConnectedTo(target) ? Behaviour.move
          : leftHandle.isConnectedTo(target) ? Behaviour.resizeLeft
          : rightHandle.isConnectedTo(target) ? Behaviour.resizeRight
          : null
      );
    }, () => {
      brushing = false;
    });

    function limit(x: number) {
      return Math.max(0, Math.min(x, currentWidth));
    }
  }

  const instance = {
    render,
    changeEvent,
    isBrushing: () => brushing,
    getWidth: () => width,
    setWidth: (_: typeof width) => (width = _, instance),
    setLeft: (_: typeof left) => (left = _, instance),
    setRight: (_: typeof right) => (right = _, instance)
  };
  return instance;
}
