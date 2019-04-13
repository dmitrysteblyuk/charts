type Listener<T> = (value: T) => void;

export class EventEmitter<T, O = {}> {
  private allListeners: Listener<T>[] = [];
  private allOptions: (O | undefined)[] = [];

  emit(value: T) {
    this.allListeners.forEach((listener) => listener(value));
  }

  on(listener: Listener<T>, options?: O) {
    this.allListeners.push(listener);
    this.allOptions.push(options);
  }

  forEach(iterator: (listener: Listener<T>, options?: O) => void) {
    this.allListeners.forEach((listener, index) => {
      iterator(listener, this.allOptions[index]);
    });
  }
}
