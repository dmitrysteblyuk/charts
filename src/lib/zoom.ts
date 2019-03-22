import {Selection} from './selection';

type ZoomEvent = MouseEvent | WheelEvent | TouchEvent;
export type ZoomPositions = ReadonlyArray<ReadonlyArray<number>>;
export const enum ZoomMode {Drag, Wheel, Pinch};

export function onZoomEvents(
  selection: Selection,
  onZoomChange: (
    positions: ZoomPositions,
    mode: ZoomMode
  ) => void,
  onZoomStart: (
    initialPositions: ZoomPositions,
    mode: ZoomMode,
    target: Selection
  ) => void,
  onZoomEnd?: (mode: ZoomMode) => void
) {
  let positions: ZoomPositions | undefined;
  let mode: ZoomMode | undefined;
  const windowSelection = new Selection(window as any);

  selection
    .on('mousedown', onStart)
    .on('touchstart', onStart, {passive: true})
    .on('wheel', onStart, {passive: true});
  windowSelection
    .on('mouseup', onEnd)
    .on('mousemove', onChange)
    .on('touchend', onEnd)
    .on('touchcancel', onEnd)
    .on('touchmove', onChange, {passive: false});

  function onStart(event: ZoomEvent) {
    if (!isTouchEvent(event)) {
      const initialPositions = getMousePositions(event);

      if (!isWheelEvent(event)) {
        startZoom(initialPositions, ZoomMode.Drag, event);
        return;
      }
      startZoom(initialPositions, ZoomMode.Wheel, event);

      const {deltaX, deltaY} = event;
      const [[x, y]] = initialPositions;
      onZoomChange([[x + deltaX, y + deltaY]], ZoomMode.Wheel);
      endZoom();
      return;
    }

    if (mode === ZoomMode.Pinch) {
      // Ignore third and further touches.
      return;
    }

    const nextPositions = positions ? [...positions] : [];
    getTouchPositions(event).some((position) => {
      const isExisting = nextPositions.some(([x, y, id]) => {
        return (
          x === position[0] &&
          y === position[1] ||
          id === position[2] && (() => {
            throw new Error(`Touch with the same ID started: ${id}.`);
          })()
        )
      });

      return !isExisting && nextPositions.push(position) >= 2;
    });

    const nextMode = (
      nextPositions.length === 1 ? ZoomMode.Drag
        : nextPositions.length === 2 ? ZoomMode.Pinch
        : (() => {
          throw new Error(
            `Incorrect number of touches made: ${nextPositions.length}.`
          );
        })()
    );

    if (mode === ZoomMode.Drag) {
      if (nextMode !== ZoomMode.Pinch) {
        // No positions have been added
        // (i.e. no different touches have been made).
        return;
      }
      // Drag becomes pinch when one touch is added.
      endZoom();
    }
    startZoom(nextPositions, nextMode, event);
  }

  function onChange(event: ZoomEvent) {
    if (!positions) {
      return;
    }
    event.preventDefault();

    if (!isTouchEvent(event)) {
      onZoomChange(getMousePositions(event), ZoomMode.Drag);
      return;
    }

    const nextPositions = [...positions];
    let hasChanged: boolean | undefined;
    getTouchPositions(event).forEach((position) => {
      const index = nextPositions.findIndex(([, , id]) => id === position[2]);
      if (index === -1) {
        return;
      }
      nextPositions.splice(index, 1, position);
      hasChanged = true;
    });

    if (!hasChanged) {
      return;
    }
    positions = nextPositions;
    onZoomChange(nextPositions, mode as ZoomMode);
  }

  function onEnd(event: ZoomEvent) {
    if (!positions) {
      return;
    }
    if (!isTouchEvent(event)) {
      endZoom();
      return;
    }

    let nextPositions = positions;
    Array.from(event.changedTouches).forEach(({identifier}) => {
      nextPositions = nextPositions.filter(([, , id]) => id !== identifier);
    });

    if (!nextPositions.length) {
      endZoom();
      return;
    }
    if (!(nextPositions.length === 1 && mode === ZoomMode.Pinch)) {
      return;
    }
    // Pinch becomes drag when one touch is removed.
    endZoom();
    startZoom(nextPositions, ZoomMode.Drag, event);
  }

  function startZoom(
    initialPositions: ZoomPositions,
    nextMode: ZoomMode,
    event: Event
  ) {
    const target = new Selection(event.target as any);
    onZoomStart(positions = initialPositions, mode = nextMode, target);
  }

  function endZoom() {
    const previousMode = mode;
    positions = mode = undefined;
    if (!onZoomEnd) {
      return;
    }
    onZoomEnd(previousMode as ZoomMode);
  }

  function getMousePositions(
    {clientX, clientY}: WheelEvent | MouseEvent
  ): ZoomPositions {
    return [[clientX, clientY]];
  }

  function getTouchPositions({changedTouches}: TouchEvent): ZoomPositions {
    return Array.from(changedTouches).map(({
      clientX,
      clientY,
      identifier
    }) => {
      return [clientX, clientY, identifier];
    });
  }

  function isWheelEvent(event: ZoomEvent): event is WheelEvent {
    return event.type === 'wheel';
  }

  function isTouchEvent(event: ZoomEvent): event is TouchEvent {
    return event.type.startsWith('touch');
  }

  // return (() => {
  //   selection
  //     .off('mousedown', onStart)
  //     .off('touchstart', onStart)
  //     .off('wheel', onStart);
  //   windowSelection
  //     .off('mouseup', onEnd)
  //     .off('mousemove', onChange)
  //     .off('touchend', onEnd)
  //     .off('touchcancel', onEnd)
  //     .off('touchmove', onChange);
  // });
}
