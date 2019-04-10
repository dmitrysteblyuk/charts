
export function createStateTransition<S>(
  onUpdate: (state: S) => void,
  isStateEqual: (a: S, b: S) => boolean,
  shouldTransition: (a: S, b: S) => boolean,
  getIntermediateState: (a: S, b: S, progress: number) => S,
  startTransition: ((
    callback: (progress: number) => void,
    onNewId: (id: any) => void,
    onStop: () => void
  ) => void),
  stopTransition: (id: any) => void
) {
  let currentState: S;
  let startState: S;
  let finalState: S | undefined;
  let transitionId: any;

  function setNewState(newState: S) {
    const skip = currentState && isStateEqual(currentState, newState);
    const updateOnly = !skip && (
      !currentState ||
      shouldTransition(currentState, newState)
    );

    if (skip || updateOnly) {
      if (transitionId != null) {
        stopTransition(transitionId);
        transitionId = null;
      }

      currentState = newState;
      finalState = undefined;
      if (!skip) {
        onUpdate(newState);
      }
      return;
    }

    finalState = newState;

    if (transitionId != null) {
      return;
    }
    startState = currentState;

    startTransition((progress) => {
      currentState = (
        progress < 1
          ? getIntermediateState(startState, finalState!, progress)
          : finalState!
      );
      onUpdate(currentState);
    }, (
      (id: any) => (transitionId = id)
    ), (
      () => (transitionId = null)
    ));
  }

  return setNewState;
}
