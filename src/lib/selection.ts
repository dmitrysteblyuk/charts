import {map} from './utils';
import {detectChanges} from './detect-changes';

const DATUM_PROPERTY = '__DATUM__';
const ACTIVE_TRANSITIONS_PROPERTY = '__ACTIVE_TRANSITIONS__';
const DEFAULT_TRANSITION_DURATION = 200;
const BEING_REMOVED_PROPERTY = '__BEING_REMOVED__';
const SVG_URI = 'http://www.w3.org/2000/svg';
const XHTML_URI = 'http://www.w3.org/1999/xhtml';

type Primitive = string | boolean | number | null | undefined;
type Selector = number | string;
type Remover<E extends Element, D> = (
  (selection: Selection<E>, datum: D, callback: () => void) => void
);
type Updater<E extends Element> = (
  (selection: Selection<E>, isNew: boolean) => void
);
type ActiveTransitions = Dictionary<{
  requestId: number;
  isFlushed?: boolean;
} | undefined>;

const {requestAnimationFrame, cancelAnimationFrame} = window;

export class Selection<EL extends Element = Element> {
  private static countID = 0;
  private selectionId?: string;

  constructor(private element: EL) {}

  isEqual({element}: Selection) {
    return element === this.element;
  }

  selectOne<E extends Element>(selector: Selector) {
    const element = (
      typeof selector === 'number'
        ? this.element.children.item(selector)
        : this.element.children.namedItem(this.getChildId(selector))
    ) as (E | null);

    if (element === null || isBeingRemoved(element)) {
      return null;
    }
    return new Selection(element);
  }

  destroy<D>(remover?: Remover<EL, D>) {
    const {element} = this;
    if (!remover) {
      removeElement(element);
      return;
    }
    startRemovingElement(element);
    remover(this, getDatum(element), () => removeElement(element));
  }

  getDataChanges<T>(data: T) {
    return detectChanges(this.element, data);
  }

  getRect(): Rect {
    const {width, height, left, top} = this.element.getBoundingClientRect();
    return {width, height, left, top};
  }

  getRoundedRect(): Rect {
    return map(this.getRect(), Math.round);
  }

  // isTouchable() {
  //   return 'ontouchstart' in this.element;
  // }

  // text(): string | null;
  text(text: Primitive): this/*;
  text(text?: Primitive): string | null | this*/ {
    // if (!arguments.length) {
    //   return this.element.textContent;
    // }
    this.element.textContent = text === null ? null : String(text);
    return this;
  }

  // attr(name: string): string | null;
  attr(name: string, value: Primitive): this/*;
  attr(name: string, value?: Primitive): this | string | null*/ {
    // if (arguments.length < 2) {
    //   return this.element.getAttribute(name);
    // }
    if (value == null) {
      this.element.removeAttribute(name);
    } else {
      this.element.setAttribute(name, String(value));
    }
    return this;
  }

  isTransitioning(name: string): boolean {
    return isBeingTransitioned(this.element, name);
  }

  flushAttrTransition(name: string): void {
    flushTransition(this.element, name);
  }

  attrTransition(
    name: string,
    interpolator: (progress: number) => string,
    duration = DEFAULT_TRANSITION_DURATION
  ): void {
    startTransition(this.element, name, interpolator, duration);
  }

  on<E extends Event = Event>(
    eventName: string,
    listener: (event: E) => void,
    options?: boolean | AddEventListenerOptions
  ): this {
    this.element.addEventListener(
      eventName,
      listener as (event: Event) => void,
      options
    );
    return this;
  }

  // off<E extends Event = Event>(
  //   eventName: string,
  //   listener: (event: E) => void
  // ): this {
  //   this.element.removeEventListener(
  //     eventName,
  //     listener as (event: Event) => void
  //   );
  //   return this;
  // }

  renderOne<E extends Element>(
    tagName: string,
    selector: Selector,
    updater?: Updater<E>
  ): Selection<E>;
  renderOne<E extends Element, D>(
    tagName: string,
    selector: string,
    updater?: Updater<E>,
    toRemove?: boolean,
    remover?: Remover<E, D>
  ): Selection<E> | null;
  renderOne<E extends Element, D>(
    tagName: string,
    selector: Selector,
    updater?: Updater<E>,
    toRemove?: boolean,
    remover?: Remover<E, D>
  ): Selection<E> | null {
    let selection = this.selectOne<E>(selector);
    if (toRemove) {
      if (selection !== null) {
        selection.destroy(remover);
      }
      return null;
    }

    let isNew = false;
    if (selection === null) {
      const childId = (
        typeof selector === 'string'
          ? this.getChildId(selector)
          : undefined
      );
      selection = this.addChild<E>(tagName, childId);
      isNew = true;
    }

    if (updater) {
      updater(selection, isNew);
    }
    return selection;
  }

  updateAll<E extends Element, D>(
    updater: (selection: Selection<E>, datum: D) => void
  ): void {
    const {children} = this.element;
    for (let index = children.length; index-- > 0; ) {
      const element = children.item(index) as E;
      if (isBeingRemoved(element)) {
        continue;
      }
      updater(new Selection(element), getDatum<D>(element));
    }
  }

  renderAll<E extends Element, D>(
    tagName: string,
    data: ReadonlyArray<D>,
    updater?: (
      selection: Selection<E>,
      datum: D,
      isNew: boolean,
      previousDatum?: D
    ) => void,
    remover?: Remover<E, D>,
    getKey?: (datum: D, index: number) => string
  ): void {
    const {children} = this.element;
    const childLength = children.length;
    const toUpdate: {element: E; datum: D; }[] = [];
    const toRemove: E[] = [];
    let toAdd: {datum: D, childId?: string, nextChildId?: string}[] = [];
    let usedDataIndex = 0;

    let lastChildId: string | undefined;
    const dataById = getKey && data.reduceRight((result, datum, index) => {
      const childId = this.getChildId(getKey(datum, index));
      result[childId] = {datum, nextChildId: lastChildId};
      lastChildId = childId;
      return result;
    }, {} as Dictionary<{datum: D, nextChildId: string | undefined}>);

    for (let index = 0; index < childLength; index++) {
      const element = children[index] as E;
      if (isBeingRemoved(element)) {
        continue;
      }

      if (!dataById) {
        if (usedDataIndex < data.length) {
          const datum = data[usedDataIndex++];
          toUpdate.push({element, datum});
        } else {
          toRemove.push(element);
        }
        continue;
      }

      const childId = element.getAttribute('id');
      if (childId !== null && dataById.hasOwnProperty(childId)) {
        const {datum} = dataById[childId];
        delete dataById[childId];
        toUpdate.push({element, datum});
      } else {
        toRemove.push(element);
      }
    }

    if (dataById) {
      toAdd = Object.keys(dataById).map((childId) => {
        const {datum, nextChildId} = dataById[childId];
        return {datum, childId, nextChildId};
      });
    } else {
      toAdd = data.slice(usedDataIndex).map((datum) => ({datum}));
    }

    toRemove.forEach((element) => {
      if (!remover) {
        removeElement(element);
        return;
      }
      new Selection(element).destroy(remover);
    });

    toUpdate.forEach(({element, datum}) => {
      const previousDatum = getDatum<D>(element);
      setDatum(element, datum);
      if (updater) {
        updater(new Selection(element), datum, false, previousDatum);
      }
    });

    toAdd.forEach(({datum, childId, nextChildId}) => {
      const selection = this.addChild<E>(tagName, childId, nextChildId);
      setDatum(selection.element, datum);
      if (updater) {
        updater(selection, datum, true);
      }
    });
  }

  private addChild<E extends Element>(
    tagName: string,
    childId?: string,
    nextChildId?: string
  ): Selection<E> {
    const parent = this.element;
    const element = createChild<E>(tagName, parent);

    if (childId !== undefined) {
      element.setAttribute('id', childId);
    }
    if (nextChildId === undefined) {
      parent.appendChild(element);
    } else {
      parent.insertBefore(element, parent.children.namedItem(nextChildId));
    }
    return new Selection(element);
  }

  private getChildId(selector: string) {
    if (this.selectionId === undefined) {
      this.selectionId = this.getSelectionId();
    }
    return `${this.selectionId}:${selector}`;
  }

  private getSelectionId() {
    if (this.element.hasAttribute('id')) {
      return this.element.getAttribute('id') as string;
    }
    const newId = `el-${Selection.countID++}`;
    this.element.setAttribute('id', newId);
    return newId;
  }
}

function removeElement(element: Element) {
  if (!element.parentElement) {
    return;
  }
  element.parentElement.removeChild(element);
}

function getDatum<D>(element: Element): D {
  return (element as any)[DATUM_PROPERTY];
}

function setDatum<D>(element: Element, datum: D): void {
  (element as any)[DATUM_PROPERTY] = datum;
}

function isBeingTransitioned(element: Element, name: string) {
  const activeTransitions = getActiveTransitions(element);
  return Boolean(activeTransitions && activeTransitions[name]);
}

function flushTransition(element: Element, name: string) {
  const activeTransitions = getActiveTransitions(element);
  const transition = activeTransitions && activeTransitions[name];
  if (!transition) {
    return;
  }
  transition.isFlushed = true;
}

function startTransition(
  element: Element,
  name: string,
  interpolator: (progress: number) => string,
  duration: number
) {
  const activeTransitions = getActiveTransitions(element, true);
  const previousTransition = activeTransitions[name];
  if (previousTransition) {
    cancelAnimationFrame(previousTransition.requestId);
  }

  animate((progress) => {
    element.setAttribute(name, interpolator(progress));
  }, (requestId) => {
    activeTransitions[name] = {requestId};
  }, duration, () => {
    activeTransitions[name] = undefined;
  }, () => {
    const transition = activeTransitions[name];
    return transition && transition.isFlushed;
  });
}

function animate(
  callback: (progress: number) => void,
  onRequest: (requestId: number) => void,
  duration: number,
  onStop: () => void,
  toFlush: () => boolean | undefined
) {
  let startTime: number | null = null;

  onRequest(requestAnimationFrame(function step(time) {
    if (startTime == null) {
      startTime = time;
    }
    const progress = (
      toFlush()
        ? 1
        : Math.min(1, (time - startTime) / duration)
    );
    callback(progress);

    if (progress === 1) {
      onStop();
      return;
    }
    onRequest(requestAnimationFrame(step));
  }));
}

function getActiveTransitions(element: Element): ActiveTransitions | undefined;
function getActiveTransitions(
  element: Element,
  initialize: true
): ActiveTransitions;
function getActiveTransitions(element: Element, initialize?: true) {
  const activeTransitions: ActiveTransitions | undefined = (
    (element as any)[ACTIVE_TRANSITIONS_PROPERTY]
  ) || initialize && (
    (element as any)[ACTIVE_TRANSITIONS_PROPERTY] = {}
  );
  return activeTransitions;
}

function isBeingRemoved(element: Element): boolean {
  return Boolean((element as any)[BEING_REMOVED_PROPERTY]);
}

function startRemovingElement(element: Element): void {
  element.removeAttribute('id');
  (element as any)[BEING_REMOVED_PROPERTY] = true;
}

function createChild<E extends Element>(
  tagName: string,
  parent: Element
): E {
  const elementDocument = parent.ownerDocument as Document;

  if (tagName === 'svg') {
    return elementDocument.createElementNS(SVG_URI, tagName) as Element as E;
  }
  if (
    parent.namespaceURI === XHTML_URI &&
    elementDocument.documentElement.namespaceURI === XHTML_URI
  ) {
    return elementDocument.createElement(tagName) as Element as E;
  }
  return elementDocument.createElementNS(parent.namespaceURI, tagName) as E;
}
