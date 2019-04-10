const {requestAnimationFrame, cancelAnimationFrame} = window;

export function stopAnimation(requestId: number) {
  cancelAnimationFrame(requestId);
}

export function startAnimation(
  callback: (progress: number) => void,
  onRequest: (requestId: number) => void,
  onStop: () => void,
  duration = 200
) {
  let startTime: number | undefined;

  onRequest(requestAnimationFrame(function step(time) {
    if (startTime == null) {
      startTime = time;
    }
    const progress = Math.min(1, (time - startTime) / duration);
    callback(progress);

    if (progress < 1) {
      onRequest(requestAnimationFrame(step));
    } else {
      onStop();
    }
  }));
}

export const easeOutCubic = getCubicBezierFunction(0.215, 0.61, 0.355);

export function getCubicBezierFunction(a: number, b: number, c: number) {
  return (x: number) => {
    const y = 1 - x;
    return a * y * y * y + 3 * b * y * y * x + 3 * c * y * x * x + x * x * x;
  };
}
