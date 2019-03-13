export function onDragEvents(
  target: Element,
  onDragMove?: (diffX: number, diffY: number) => void,
  onDragStart?: (startX: number, startY: number, target: Element) => void,
  onDragEnd?: () => void
) {
  let isDragging = false;
  let currentX = 0;
  let currentY = 0;

  target.addEventListener('mousedown', onStart);
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('mousemove', onMove);

  target.addEventListener('touchstart', onStart);
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
    onDragStart(currentX, currentY, event.target as Element);
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
    target.removeEventListener('mousedown', onStart);
    window.removeEventListener('mouseup', onEnd);
    window.removeEventListener('mousemove', onMove);

    target.removeEventListener('touchstart', onStart);
    window.removeEventListener('touchend', onEnd);
    window.removeEventListener('touchcancel', onEnd);
    window.removeEventListener('touchmove', onMove);
  });

  function getPosition(event: Event) {
    const {clientX: nextX, clientY: nextY} = (
      event.type === 'touchmove'
        ? (event as TouchEvent).touches[0]
        : event as MouseEvent
    );
    return {nextX, nextY};
  }
}
