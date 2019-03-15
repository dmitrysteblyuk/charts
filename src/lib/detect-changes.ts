import {forEach} from './utils';

type ObjectChanges<T> = {[key in keyof T]?: boolean};
type ValueChangesGetter<T, C> = (
  (previousValue: T | undefined, nextValue: T) => C | null
);
type StoreValueGetter<T, S> = (store: S) => T | undefined;
type StoreValueUpdater<T, S> = (
  (store: S, previousValue: T | undefined, nextValue: T) => void
);

const DEFAULT_DATA_PROPERTY = '__DETECT_CHANGES_DATA__';

export function detectChanges<
  T,
  S extends Dictionary<any> = Dictionary<any>,
  C = ObjectChanges<T>
>(
  store: S,
  nextValue: T,
  getValueChanges = getObjectChanges as ValueChangesGetter<T, C>,
  getValueFromStore = getValueFromStoreDefault as StoreValueGetter<T, S>,
  updateValueInStore = updateObjectInStoreDefault as StoreValueUpdater<T, S>
) {
  const previousValue = getValueFromStore(store);
  const changes = getValueChanges(previousValue, nextValue);
  if (changes !== null) {
    updateValueInStore(store, previousValue, nextValue);
  }
  return changes;
}

function getValueFromStoreDefault<
  T,
  S extends Dictionary<any> = Dictionary<any>
>(
  store: S
): T | undefined {
  return store[DEFAULT_DATA_PROPERTY];
}

function updateObjectInStoreDefault<
  T,
  S extends Dictionary<any> = Dictionary<any>
>(
  store: S,
  previousValue: T | undefined,
  nextValue: T
): void {
  if (previousValue === undefined) {
    store[DEFAULT_DATA_PROPERTY] = nextValue;
    return;
  }
  forEach(nextValue, (value, key) => {
    previousValue[key] = value;
  });
}

function getObjectChanges<T>(
  previousValue: T | undefined,
  nextValue: T
): ObjectChanges<T> | null {
  if (previousValue === nextValue) {
    return null;
  }
  const changes: ObjectChanges<T> = {};
  let isChanged = previousValue === undefined;

  forEach(nextValue, (value, key) => {
    if (previousValue !== undefined && value === previousValue[key]) {
      return;
    }
    changes[key] = isChanged = true;
  });

  if (!isChanged) {
    return null;
  }
  return changes;
}
