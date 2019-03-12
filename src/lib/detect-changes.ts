export function detectChanges<T, C = {[p in keyof T]?: boolean}>(
  context: {[s: string]: any},
  nextValue: T,
  getValueChanges = getObjectChanges as (
    (previousValue: T | undefined, nextValue: T) => C | null
  ),
  internalValueProperty = '__DETECT_CHANGES_VALUE__'
) {
  const previousValue = context[internalValueProperty];
  const changes = getValueChanges(previousValue, nextValue);

  context[internalValueProperty] = nextValue;

  return changes;
}

function getObjectChanges(
  previousValue: IDict<any>,
  nextValue: IDict<any>
): IDict<boolean> | null {
  const changes: IDict<boolean> = {};
  let isChanged: true | undefined;

  Object.keys(nextValue).forEach((key) => {
    if (
      previousValue !== undefined &&
      nextValue[key] === previousValue[key]
    ) {
      return;
    }
    changes[key] = isChanged = true;
  });

  if (previousValue !== undefined) {
    Object.keys(previousValue).forEach((key) => {
      if (previousValue[key] === nextValue[key]) {
        return;
      }
      changes[key] = isChanged = true;
    });
  }

  if (!isChanged) {
    return null;
  }
  return changes;
}
