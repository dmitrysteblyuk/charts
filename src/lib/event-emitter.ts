type Listener<T> = (value: T) => void;

export class EventEmitter<T> {
  private allListeners: Listener<T>[] = [];

  emit(value: T) {
    this.allListeners.forEach(listener => listener(value));
  }

  on(listener: Listener<T>) {
    this.allListeners.push(listener);
  }

  off(listener: Listener<T>) {
    this.allListeners = this.allListeners.filter(item => item !== listener);
  }
}
