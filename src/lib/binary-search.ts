/**
  * Returns startIndex - 1 if length < 1 (i.e. startIndex >= endIndex)
  * Returns endIndex if searched value is always greater[or equal]
  * (i.e. isLessOrLessOrEqualThan always returns false)
  */
export function binarySearch(
  startIndex: number,
  endIndex: number,
  isLessOrLessOrEqualThan: (index: number) => boolean
): number {
  if (startIndex >= endIndex) {
    return startIndex - 1;
  }
  return search(startIndex, endIndex);

  function search(start: number, end: number): number {
    const middle = Math.floor((end - start) / 2) + start;
    if (isLessOrLessOrEqualThan(middle)) {
      if (middle === start) {
        return middle;
      }
      return search(start, middle);
    }
    if (middle === end - 1) {
      return end;
    }
    return search(middle + 1, end);
  }
}
