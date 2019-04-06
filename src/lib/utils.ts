export function forEach<T>(
  object: T,
  iterator: (value: T[keyof T], key: keyof T) => void
) {
  (Object.keys(object) as (keyof T)[]).forEach((key) => {
    iterator(object[key], key);
  });
}

export function map<T extends {}, V>(
  object: T,
  mapper: (value: T[keyof T], key: keyof T) => V
) {
  const output = {} as {[key in keyof T]: V};
  forEach(object, (value, key) => {
    output[key] = mapper(value, key);
  });
  return output;
}

export function newArray<T>(length: number, creator: (index: number) => T) {
  return Array.from(new Array(length)).map((_, index) => creator(index));
}

export function groupBy<T>(array: T[], isSameGroup: (a: T, b: T) => boolean) {
  return array.reduce<T[][]>((result, item) => {
    const index = result.findIndex((group) => isSameGroup(group[0], item));
    if (index < 0) {
      result.push([item]);
    } else {
      result[index].push(item);
    }
    return result;
  }, []);
}

export function roundRange(min: number, max: number) {
  const roundedMin = Math.round(min);
  const roundedMax = Math.round(max);

  if (roundedMin < roundedMax || !(min < max)) {
    return [roundedMin, roundedMax];
  }
  return [Math.floor(min), Math.ceil(max)];
}

export function arrayIsEqual<T>(
  a: ArrayLike<T>,
  b: ArrayLike<T>
): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

export function isPositive(x: number): boolean {
  return x > 0 && isFinite(x);
}

export function memoizeOne<T extends (...args: any[]) => any>(
  method: T,
  context?: any
): T & {clearCache: () => void} {
  let lastArgs: IArguments | undefined;
  let lastResult: any;

  memoized.clearCache = () => {
    lastArgs = lastResult = undefined;
  };

  return memoized as any;

  function memoized() {
    if (!lastArgs || !arrayIsEqual(lastArgs, arguments)) {
      lastArgs = arguments;
      lastResult = method.apply(context, arguments as any);
    }
    return lastResult;
  }
}

export function setProps<T, K extends keyof T = keyof T>(
  object: T,
  props: Pick<T, K>
): T {
  forEach(props, (value, key) => object[key] = value);
  return object;
}

export class List<V, K extends string = string> {
  private byKey = new Map<string, ListItem<V, K>>();
  private firstItem: ListItem<V, K> | null = null;
  private lastItem: ListItem<V, K> | null = null;

  forEach(iterator: (value: V, key: K) => void) {
    for (let item = this.firstItem; item; item = item.nextItem) {
      iterator(item.value, item.key);
    }
  }

  getValues(): V[] {
    const values: V[] = [];
    for (let item = this.firstItem; item; item = item.nextItem) {
      values.push(item.value);
    }
    return values;
  }

  getKeys(): K[] {
    const keys: K[] = [];
    for (let item = this.firstItem; item; item = item.nextItem) {
      keys.push(item.key);
    }
    return keys;
  }

  getNextKey(key: string) {
    const {nextItem} = this.byKey.get(key);
    return nextItem && nextItem.key;
  }

  replace(key: K, newKey: K, value: V) {
    const currentItem = this.byKey.get(key);
    currentItem.key = newKey;
    currentItem.value = value;
    this.byKey.delete(key);
    this.byKey.set(newKey, currentItem);
  }

  set(key: K, value: V, beforeKey?: K | null): void {
    let item = this.byKey.get(key);
    let beforeItem: ListItem<V, K> | null | undefined;

    if (beforeKey == null) {
      beforeItem = beforeKey;
    } else {
      (beforeItem = this.byKey.get(beforeKey)).key;
    }

    if (item) {
      item.value = value;
      if (beforeItem === undefined || item.nextItem === beforeItem) {
        return;
      }
      this.removeConnected(item);
    } else {
      item = new ListItem(value, key);
      this.byKey.set(key, item);
    }
    this.insertUnconnected(item, beforeItem || null);
  }

  delete(key: K): void {
    this.removeConnected(this.byKey.get(key));
    this.byKey.delete(key);
  }

  get(key: K): V {
    return this.byKey.get(key).value;
  }

  has(key: K): boolean {
    return this.byKey.has(key);
  }

  private insertUnconnected(
    item: ListItem<V, K>,
    beforeItem: ListItem<V, K> | null
  ) {
    if (item === beforeItem) {
      throw new Error(`Cannot insert before self.`);
    }
    const previousItem = beforeItem ? beforeItem.previousItem : this.lastItem;
    if (previousItem) {
      previousItem.nextItem = item;
    } else {
      this.firstItem = item;
    }

    item.previousItem = previousItem;
    item.nextItem = beforeItem;

    if (beforeItem) {
      beforeItem.previousItem = item;
    } else {
      this.lastItem = item;
    }
  }

  private removeConnected(item: ListItem<V, K>) {
    const {previousItem, nextItem} = item;
    if (previousItem) {
      previousItem.nextItem = nextItem;
    } else {
      this.firstItem = nextItem;
    }
    if (nextItem) {
      nextItem.previousItem = previousItem;
    } else {
      this.lastItem = previousItem;
    }
  }
}

class ListItem<V, K> {
  previousItem: ListItem<V, K> | null = null;
  nextItem: ListItem<V, K> | null = null;
  constructor (public value: V, public key: K) {}
}
