import {onZoomEvents, ZoomMode} from '../lib/zoom';
import {Selection} from '../lib/selection';
import {roundRange} from '../lib/utils';
import {EventEmitter} from '../lib/event-emitter';

const enum Behaviour {selectNew, resizeLeft, resizeRight, move};
const defaultFill = 'transparent';

export type Brush = Readonly<ReturnType<typeof createBrush>>;

export function createBrush() {
  const changeEvent = new EventEmitter<{
    left: number;
    right: number;
  }>();
  const activeEvent = new EventEmitter<boolean>();

  let width = 0;
  let height = 0;
  let left = 0;
  let right = 0;
  const color = 'rgba(0, 25, 100, 0.1)';
  const borderWidth = 10;

  let reset = true;
  let draggedBeforeClick = false;

  function render(container: Selection) {
    reset = !(left > 0 || right < width);
    let isNew: boolean | undefined;

    const rectSelection = container.renderOne('rect', 5, (selection) => {
      selection.setAttrs({
        'x': '0',
        'y': '0',
        'stroke': color,
        'fill': 'transparent'
      });
      isNew = true;
    }).setAttrs({
      'width': width,
      'height': height
    });

    container.renderOne('rect', 0, (selection) => {
      selection.setAttrs({
        'fill': color,
        'x': '0',
        'y': '0'
      }).on('click', onResetClick);
    }).setAttrs({
      'width': left,
      'height': height
    });

    container.renderOne('rect', 1, (selection) => {
      selection.setAttrs({
        'fill': color,
        'y': '0'
      }).on('click', onResetClick);
    }).setAttrs({
      'x': right,
      'width': width - right,
      'height': height
    });

    const centerRect = container.renderOne('rect', 2);
    centerRect.setStyles({'display': reset ? 'none' : null});
    if (!reset) {
      centerRect.setAttrs({
        'fill': defaultFill,
        'x': left,
        'width': right - left,
        'height': height,
        'y': 0
      });
    }

    const leftHandle = container.renderOne('rect', 3).setAttrs({
      'fill': defaultFill,
      'x': left - borderWidth,
      'width': borderWidth * 2,
      'height': height,
      'y': 0
    });

    const rightHandle = container.renderOne('rect', 4).setAttrs({
      'fill': defaultFill,
      'x': right - borderWidth,
      'width': borderWidth * 2,
      'height': height,
      'y': 0
    });

    if (!isNew) {
      return;
    }
    bindDragEvents(
      container,
      rectSelection,
      centerRect,
      leftHandle,
      rightHandle
    );
  }

  function onResetClick() {
    if (draggedBeforeClick || reset) {
      return;
    }
    reset = true;
    changeEvent.emit({
      left: 0,
      right: width
    });
  }

  function bindDragEvents(
    container: Selection,
    rectSelection: Selection,
    centerRect: Selection,
    leftHandle: Selection,
    rightHandle: Selection
  ) {
    let behaviour: Behaviour | undefined;
    let startLeft = 0;
    let startRight = 0;
    let sumDiffX = 0;
    let hasChanged: boolean;
    let currentX = 0;
    let currentWidth = width;

    onZoomEvents(container, ([[nextX]], mode) => {
      if (mode !== ZoomMode.Drag) {
        return;
      }
      draggedBeforeClick = true;
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

      if (!hasChanged) {
        hasChanged = true;
        nextLeft = startLeft;
        nextRight = startRight;
        activeEvent.emit(true);
      }

      sumDiffX += diffX;

      switch (behaviour) {
        case Behaviour.selectNew:
          if (diffX > 0) {
            behaviour = Behaviour.resizeRight;
            nextRight = limit(startRight + sumDiffX);
          } else {
            behaviour = Behaviour.resizeLeft;
            nextLeft = limit(startLeft + sumDiffX);
          }
          break;
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
      reset = false;
      changeEvent.emit({
        left: nextLeft,
        right: nextRight
      });
    }, ([[initialX]], mode, {target}: {target: any}) => {
      if (mode !== ZoomMode.Drag) {
        return;
      }
      currentX = initialX;
      draggedBeforeClick = false;
      sumDiffX = 0;
      currentWidth = width;

      behaviour = (
        reset ? Behaviour.selectNew
          : centerRect.isConnectedTo(target) ? Behaviour.move
          : leftHandle.isConnectedTo(target) ? Behaviour.resizeLeft
          : rightHandle.isConnectedTo(target) ? Behaviour.resizeRight
          : Behaviour.selectNew
      );

      if (behaviour === Behaviour.selectNew) {
        const startX = Math.round(initialX - rectSelection.getRect()!.left);
        startLeft = startRight = limit(startX);
        return;
      }

      startLeft = left;
      startRight = right;
    }, () => {
      if (!hasChanged) {
        return;
      }
      hasChanged = false;
      activeEvent.emit(false);
    });

    function limit(x: number) {
      return Math.max(0, Math.min(x, currentWidth));
    }
  }

  const instance = {
    render,
    changeEvent,
    activeEvent,
    isReset: () => reset,
    getWidth: () => width,
    setWidth: (_: typeof width) => (width = _, instance),
    setHeight: (_: typeof height) => (height = _, instance),
    setLeft: (_: typeof left) => (left = _, instance),
    setRight: (_: typeof right) => (right = _, instance)
  };
  return instance;
}
