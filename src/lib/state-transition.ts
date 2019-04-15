export function createStateTransition<S, T>(
  onUpdate: (state: S, triggers: T | null) => void,
  isStateEqual: (from: S, to: S) => boolean,
  getTransitionTriggers: (from: S, to: S) => T | null,
  getIntermediateState: (from: S, to: S, progress: number, triggers: T) => S,
  getDuration: (triggers: T) => number,
  startTransition: ((
    callback: (progress: number) => void,
    onNext: (id: number | null) => void,
    duration: number
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
        onUpdate(newState, null);
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
      onUpdate(currentState, triggers);
    }, (id: number | null) => {
      transitionId = id;
    }, getDuration(triggers));
  }

  return setNewState;
}
