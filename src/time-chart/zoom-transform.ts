import {ZoomMode, ZoomPositions} from '../lib/zoom';
import {Selection} from '../lib/selection';

export function getZoomFactorAndOffset(
  startPositions: ZoomPositions,
  positions: ZoomPositions,
  mode: ZoomMode,
  [startTime, endTime]: NumberRange,
  startWidth: number,
  rectSelection: Selection
) {
  const timeSpan = endTime - startTime;
  if (
    mode === ZoomMode.Wheel &&
    positions[0][0] === startPositions[0][0] &&
    positions[0][1] !== startPositions[0][1]
  ) {
    const [startX, startY] = startPositions[0];
    const factor = 1 + (positions[0][1] - startY) / window.outerHeight;
    const fixedX = startX - rectSelection.getRect().left;
    const fixedT = fixedX / startWidth * timeSpan + startTime;
    return [factor, fixedT * (1 - factor)];
  }

  if (mode !== ZoomMode.Pinch) {
    const diffT = (
      (positions[0][0] - startPositions[0][0]) /
      (mode === ZoomMode.Wheel ? window.outerWidth : -startWidth) *
      timeSpan
    );
    return [1, diffT];
  }

  const [[x0, y0], [x1, y1]] = positions;
  const [[xn0, yn0], [xn1, yn1]] = startPositions;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dnx = xn1 - xn0;
  const dny = yn1 - yn0;

  const a = (dnx * dx + dny * dy) / (dx * dx + dy * dy);
  const b = (-dnx * dy + dny * dx) / (dx * dx + dy * dy);
  // Instead of `a` use square root of matrix determinant to prevent rotation.
  const normalizedFactor = Math.sqrt(a * a + b * b);
  const c = xn0 - normalizedFactor * x0/* + b * y0*/;
  // const d = yn0 - b * x0 - a * y0;

  const offset = (1 - a) * startTime + c * timeSpan / startWidth;

  return [a/* - b*/, offset];
}
