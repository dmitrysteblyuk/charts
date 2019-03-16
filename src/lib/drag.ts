import {Selection} from './selection';

export function onDragEvents(
  target: Selection,
  onDragMove?: (diffX: number, diffY: number) => void,
  onDragStart?: (startX: number, startY: number, target: Selection) => void,
  onDragEnd?: () => void
) {
  let isDragging = false;
  let currentX = 0;
  let currentY = 0;

  target
    .on('mousedown', onStart)
    .on('touchstart', onStart);
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchend', onEnd);
  window.addEventListener('touchcancel', onEnd);
  window.addEventListener('touchmove', onMove);

  function onStart(event: Event) {
    const {nextX, nextY} = getPosition(event);
    currentX = nextX;
    currentY = nextY;
    isDragging = true;
    if (!onDragStart) {
      return;
    }
    onDragStart(currentX, currentY, new Selection(event.target as Element));
  }

  function onEnd() {
    isDragging = false;
    if (!onDragEnd) {
      return;
    }
    onDragEnd();
  }

  function onMove(event: Event) {
    if (!isDragging) {
      return;
    }
    event.preventDefault();

    const {nextX, nextY} = getPosition(event);
    const diffX = -currentX + (currentX = nextX);
    const diffY = -currentY + (currentY = nextY);

    if (!onDragMove) {
      return;
    }
    onDragMove(diffX, diffY);
  }

  return (() => {
    target
      .off('mousedown', onStart)
      .off('touchstart', onStart);
    window.removeEventListener('mouseup', onEnd);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('touchend', onEnd);
    window.removeEventListener('touchcancel', onEnd);
    window.removeEventListener('touchmove', onMove);
  });

  function getPosition(event: Event) {
    const {clientX: nextX, clientY: nextY} = (
      (
        event.type === 'touchstart' ||
        event.type === 'touchmove'
      )
        ? (event as TouchEvent).changedTouches[0]
        : event as MouseEvent
    );
    return {nextX, nextY};
  }
}
