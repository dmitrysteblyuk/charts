export function binarySearch(
  startIndex: number,
  endIndex: number,
  isLessThan: (index: number) => boolean
): number {
  if (startIndex < endIndex) {
    return search(startIndex, endIndex);
  }
  return startIndex - 1;

  function search(start: number, end: number): number {
    const middle = Math.floor((end - start) / 2) + start;
    if (isLessThan(middle)) {
      if (middle === start) {
        return start;
      }
      return search(start, middle);
    }
    if (middle === end - 1) {
      return end;
    }
    return search(middle + 1, end);
  }
}
