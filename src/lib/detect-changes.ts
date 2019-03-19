import {forEach} from './utils';

interface ObjectChanges<T> {
  changes: {readonly [key in keyof T]?: boolean} | null,
  previous: Readonly<Partial<T>>
}
type ValueChangesGetter<T, C> = (
  (value: T | undefined, nextValue: T) => C
);
type StoreValueGetter<T, S> = (store: S) => T | undefined;
type StoreValueUpdater<T, S> = (
  (store: S, value: T | undefined, nextValue: T) => void
);

const DEFAULT_DATA_PROPERTY = '__DETECT_CHANGES_DATA__';

export function detectChanges<
  T,
  S extends Dictionary<any> = Dictionary<any>,
  C extends {changes?: {} | null, previous?: {}} = ObjectChanges<T>
>(
  store: S,
  nextValue: T,
  getValueChanges = getObjectChanges as ValueChangesGetter<T, C>,
  getValueFromStore = getValueFromStoreDefault as StoreValueGetter<T, S>,
  updateValueInStore = updateObjectInStoreDefault as StoreValueUpdater<T, S>
) {
  const value = getValueFromStore(store);
  const result = getValueChanges(value, nextValue);
  if (result.changes !== null) {
    updateValueInStore(store, value, nextValue);
  }
  return result;
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
  value: T | undefined,
  nextValue: T
): void {
  if (value === undefined) {
    store[DEFAULT_DATA_PROPERTY] = nextValue;
    return;
  }
  forEach(nextValue, (property, key) => {
    value[key] = property;
  });
}

function getObjectChanges<T>(
  value: T | undefined,
  nextValue: T
): ObjectChanges<T> {
  const previous: Partial<T> = {};
  if (value === nextValue) {
    return {
      changes: null,
      previous
    };
  }

  const changes: {[key in keyof T]?: boolean} = {};
  let isChanged = value === undefined;

  forEach(nextValue, (property, key) => {
    if (value !== undefined && value[key] === property) {
      return;
    }
    changes[key] = isChanged = true;
    previous[key] = value && value[key];
  });

  return {
    changes: isChanged ? changes : null,
    previous
  };
}
