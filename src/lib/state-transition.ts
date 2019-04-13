export function createStateTransition<S, T>(
  onUpdate: (state: S) => void,
  isStateEqual: (from: S, to: S) => boolean,
  getTransitionTriggers: (from: S, to: S) => T | null,
  getIntermediateState: (from: S, to: S, progress: number, triggers: T) => S,
  startTransition: ((
    callback: (progress: number) => void,
    onNext: (id: number | null) => void
  ) => void),
  stopTransition: (id: number) => void
) {
  let currentState: S | undefined;
  let transitionId: number | null = null;

  function setNewState(newState: S) {
    if (transitionId !== null) {
      stopTransition(transitionId);
      transitionId = null;
    }

    let equal: boolean | undefined;
    let triggers: T | null;

    if (
      !currentState ||
      (equal = isStateEqual(currentState, newState)) ||
      (triggers = getTransitionTriggers(currentState, newState)) === null
    ) {
      currentState = newState;

      if (!equal) {
        onUpdate(newState);
      }
      return;
    }

    const startState = currentState;
    const finalState = newState;

    startTransition((progress) => {
      currentState = (
        progress < 1
          ? getIntermediateState(startState, finalState, progress, triggers!)
          : finalState
      );
      onUpdate(currentState);
    }, (id: number | null) => {
      transitionId = id;
    });
  }

  return setNewState;
}
