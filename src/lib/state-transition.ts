
export function createStateTransition<S>(
  onUpdate: (state: S) => void,
  isEqual: (a: S, b: S) => boolean,
  isTransitionEqual: (a: S, b: S) => boolean,
  getIntermediate: (a: S, b: S, progress: number) => S,
  startTransition: ((
    callback: (progress: number) => void,
    onNewId: (id: any) => void,
    onStop: () => void
  ) => void),
  stopTransition: (id: any) => void
) {
  let currentState: S;
  let startState: S;
  let finalState: S;
  let transitionId: any;

  function setNewState(newState: S) {
    const skip = currentState && isEqual(currentState, newState);
    const updateOnly = !skip && (
      !currentState ||
      isTransitionEqual(currentState, newState)
    );

    if (skip || updateOnly) {
      if (transitionId != null) {
        stopTransition(transitionId);
        transitionId = null;
      }
      currentState = newState;
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
          ? getIntermediate(startState, finalState, progress)
          : finalState
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
