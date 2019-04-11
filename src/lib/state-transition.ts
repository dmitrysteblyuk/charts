export function createStateTransition<S>(
  onUpdate: (state: S) => void,
  isStateEqual: (from: S, to: S) => boolean,
  getTransitionReason: (from: S, to: S) => number,
  getIntermediateState: (
    from: S,
    to: S,
    progress: number,
    reason: number
  ) => S,
  startTransition: ((
    callback: (progress: number) => void,
    onNewId: (id: any) => void,
    onStop: () => void
  ) => void),
  stopTransition: (id: any) => void
) {
  let currentState: S | undefined;
  let transitionId: any;

  function setNewState(newState: S) {
    if (transitionId != null) {
      stopTransition(transitionId);
      transitionId = null;
    }

    let equal: boolean | undefined;
    let reason: number;

    if (
      !currentState ||
      (equal = isStateEqual(currentState, newState)) ||
      (reason = getTransitionReason(currentState, newState)) === -1
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
          ? getIntermediateState(startState!, finalState!, progress, reason)
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
