import {onZoomEvents, ZoomMode} from '../lib/zoom';
import {Selection} from '../lib/selection';
import {roundRange} from '../lib/utils';
import {EventEmitter} from '../lib/event-emitter';

const enum Behaviour {resizeLeft, resizeRight, move};

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
  let theme: Theme;
  const handleWidth = 10;
  const minWidth = handleWidth;

  function render(container: Selection) {
    let isNew: boolean | undefined;
    const common = {
      'y': 0,
      'height': height
    };

    container.renderOne('rect', 0, (selection) => {
      selection.setAttrs(common);
      isNew = true;
    }).setAttrs({
      'width': left,
      'opacity': theme.brushMaskOpacity,
      'fill': theme.brushMaskColor
    });

    container.renderOne('rect', 1, (selection) => {
      selection.setAttrs(common);
    }).setAttrs({
      'x': right,
      'width': width - right,
      'fill': theme.brushMaskColor,
      'opacity': theme.brushMaskOpacity
    });

    const centerRect = container.renderOne('rect', 2, (selection) => {
      selection.setAttrs({
        'y': 0.5,
        'height': height - 1,
        'fill': 'transparent',
        'stroke-width': 1
      });
    }).setAttrs({
      'x': left,
      'width': right - left,
      'stroke': theme.brushHandleColor
    });

    const leftHandle = container.renderOne('path', 3, (selection) => {
      selection.setAttrs({
        'd': (
          `M0 ${
            height - handleWidth
          } V${handleWidth} Q0 0 ${handleWidth} 0 H${handleWidth} V${
            height
          } Q0 ${height} 0 ${height - handleWidth}Z`
        )
      });
    }).setAttrs({
      'transform': `translate(${left - handleWidth})`,
      'fill': theme.brushHandleColor
    });

    const rightHandle = container.renderOne('path', 4, (selection) => {
      selection.setAttrs({
        'd': (
          `M${handleWidth} ${
            height - handleWidth
          } V${handleWidth} Q${handleWidth} 0 0 0 H0 V${
            height
          } Q${handleWidth} ${height} ${handleWidth} ${height - handleWidth}Z`
        )
      });
    }).setAttrs({
      'transform': `translate(${right})`,
      'fill': theme.brushHandleColor
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
          nextLeft = Math.max(
            0, Math.min(startLeft + sumDiffX, right - minWidth)
          );
          break;
        case Behaviour.resizeRight:
          nextRight = Math.max(
            left + minWidth, Math.min(startRight + sumDiffX, currentWidth)
          );
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
  }

  const instance = {
    getMinWidth: () => minWidth,
    render,
    changeEvent,
    isBrushing: () => brushing,
    getWidth: () => width,
    setTheme: (_: typeof theme) => (theme = _, instance),
    setWidth: (_: typeof width) => (width = _, instance),
    setLeft: (_: typeof left) => (left = _, instance),
    setRight: (_: typeof right) => (right = _, instance)
  };
  return instance;
}
