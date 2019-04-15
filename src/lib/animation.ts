const {requestAnimationFrame, cancelAnimationFrame} = window;

export function stopAnimation(animationId: number) {
  cancelAnimationFrame(animationId);
}

export function startAnimation(
  callback: (progress: number) => void,
  onNext: (animationId: number | null) => void,
  duration: number
) {
  let startTime: number | undefined;

  onNext(requestAnimationFrame(function step(time) {
    const elapsed = time - (startTime || (startTime = time));
    const progress = Math.min(1, elapsed / duration);
    callback(progress);

    onNext(progress < 1 ? requestAnimationFrame(step) : null);
  }));
}

export function getCubicBezierFunction(a: number, b: number, c: number) {
  return (x: number) => {
    const y = 1 - x;
    return a * y * y * y + 3 * b * y * y * x + 3 * c * y * x * x + x * x * x;
  };
}

export const easeOutCubic = getCubicBezierFunction(0.215, 0.61, 0.355);
