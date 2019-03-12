export function onDrag(
  target: Element,
  listener: (diffX: number, diffY: number) => void,
  onDragStart?: (startX: number, startY: number, target: Element) => void,
  onDragEnd?: () => void
) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  target.addEventListener('mousedown', dragStart);
  window.addEventListener('mouseup', dragEnd);
  window.addEventListener('mousemove', drag);

  target.addEventListener('touchstart', dragStart);
  window.addEventListener('touchend', dragEnd);
  window.addEventListener('touchcancel', dragEnd);
  window.addEventListener('touchmove', drag);

  function dragStart(event: Event) {
    const {clientX, clientY} = (
      event.type === 'touchstart'
        ? (event as TouchEvent).touches[0]
        : event as MouseEvent
    );
    startX = clientX;
    startY = clientY;
    if (onDragStart) {
      onDragStart(startX, startY, event.target as Element);
    }
    isDragging = true;
  }

  function dragEnd() {
    isDragging = false;
    if (onDragEnd) {
      onDragEnd();
    }
  }

  function drag(event: Event) {
    if (!isDragging) {
      return;
    }

    const {clientX, clientY} = (
      event.type === 'touchmove'
        ? (event as TouchEvent).touches[0]
        : event as MouseEvent
    );
    event.preventDefault();

    listener(clientX - startX, clientY - startY);
  }

  return (() => {
    target.removeEventListener('mousedown', dragStart);
    window.removeEventListener('mouseup', dragEnd);
    window.removeEventListener('mousemove', drag);

    target.removeEventListener('touchstart', dragStart);
    window.removeEventListener('touchend', dragEnd);
    window.removeEventListener('touchcancel', dragEnd);
    window.removeEventListener('touchmove', drag);
  });
}
