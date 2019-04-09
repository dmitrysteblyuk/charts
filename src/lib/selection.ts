import {
  map,
  forEach,
  isArrayEqual,
  startAnimation,
  stopAnimation
} from './utils';

export const DEFAULT_ANIMATION_DURATION = 200;

const ACTIVE_TRANSITIONS_PROPERTY = '__ACTIVE_TRANSITIONS__';
const BEING_REMOVED_PROPERTY = '__BEING_REMOVED__';
const SVG_URI = 'http://www.w3.org/2000/svg';
const XHTML_URI = 'http://www.w3.org/1999/xhtml';
const DATA_CHANGES_PROPERTIES = [
  '__ATTRIBUTE_CHANGES__',
  '__STYLE_CHANGES__',
  '__DATA_CHANGES__'
];

export const enum DataType {attributes, styles, data};

type Primitive = string | boolean | number | undefined;
type TrackData = Dictionary<Primitive | null | ReadonlyArray<Primitive | {}>>;
type Selector = number | string;
type AnyElement = Element & ElementCSSInlineStyle & GlobalEventHandlers;
type Remover<E extends AnyElement> = (
  (selection: Selection<E>, callback: () => void) => void
);
type ActiveTransitions = Dictionary<{
  requestId: number;
} | undefined>;

export class Selection<EL extends AnyElement = AnyElement> {
  private static countID = 0;
  private selectionId?: string;
  private justCreated = false;

  constructor(private readonly element: EL) {}

  setStyles(styles: CSSProperties) {
    const {style} = this.element;
    const changes = detectChanges<Dictionary<any>>(
      this.element,
      styles,
      DataType.styles
    );
    if (!changes) {
      return this;
    }
    forEach(changes, (_, key) => (
      style[key as any] = (styles as any)[key] as any)
    );
    return this;
  }

  getValue(this: Selection<HTMLInputElement>) {
    return this.element.value;
  }

  getContext(this: Selection<HTMLCanvasElement>) {
    return this.element.getContext('2d')!;
  }

  isSame({element}: Selection) {
    return element === this.element;
  }

  isDescendant({element}: Selection) {
    let parentElement: AnyElement | null = this.element;
    for (;
      parentElement && parentElement !== element;
      {parentElement} = parentElement
    ) {}
    return parentElement !== null;
  }

  isNew(): boolean {
    return this.justCreated;
  }

  selectOne<E extends AnyElement>(selector: Selector) {
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

  getChildIndex({element}: Selection) {
    return Array.from(this.element.children).findIndex(
      (childElement) => childElement === element
    );
  }

  destroy(remover?: Remover<EL>) {
    const {element} = this;
    if (!remover) {
      removeElement(element);
      return;
    }
    startRemovingElement(element);
    remover(this, () => removeElement(element));
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

  text(text: Primitive): this {
    if (!detectChanges(this.element, {children: text}, DataType.attributes)) {
      return this;
    }
    this.element.textContent = text === null ? null : String(text);
    return this;
  }

  attr(data: Dictionary<Primitive>): this;
  attr(name: string, value: Primitive): this;
  attr(
    nameOrData: string | Dictionary<Primitive>,
    attrValue?: Primitive
  ): this {
    const data = (
      typeof nameOrData === 'string'
        ? {[nameOrData]: attrValue}
        : nameOrData
    );
    const changes = detectChanges(this.element, data, DataType.attributes);
    if (!changes) {
      return this;
    }
    forEach(changes, (_, name) => {
      const value = data[name];
      // console.log('update attr', name, value);
      if (value == null) {
        this.element.removeAttribute(name);
      } else {
        this.element.setAttribute(name, String(value));
      }
    });
    return this;
  }

  isAttrTransitioning(name: string): boolean {
    return isBeingTransitioned(this.element, name);
  }

  attrTransition(
    name: string,
    interpolator: (progress: number) => string,
    duration = DEFAULT_ANIMATION_DURATION
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

  renderOne<E extends AnyElement>(
    tagName: string,
    selector: Selector,
    initialAttributes?: Dictionary<Primitive>,
    initialStyles?: CSSProperties
  ): Selection<E> {
    const existingSelection = this.selectOne<E>(selector);
    if (existingSelection !== null) {
      return existingSelection;
    }
    const selection = this.addChild<E>(tagName, selector);
    const {element} = selection;

    if (initialAttributes) {
      for (const name in initialAttributes) {
        element.setAttribute(name, String(initialAttributes[name]));
      }
    }
    if (initialStyles) {
      for (const name in initialStyles) {
        element.style[name as any] = (initialStyles as any)[name];
      }
    }
    return selection;
  }

  private addChild<E extends AnyElement>(
    tagName: string,
    selector: Selector
  ): Selection<E> {
    const parent = this.element;
    const element = createChild<E>(tagName, parent);
    const childId = (
      typeof selector === 'string'
        ? this.getChildId(selector)
        : undefined
    );

    if (childId !== undefined) {
      element.setAttribute('id', childId);
    }
    parent.appendChild(element);

    const selection = new Selection(element);
    selection.justCreated = true;
    return selection;
  }

  private getChildId(selector: string) {
    if (this.selectionId === undefined) {
      this.selectionId = this.getSelectionId();
    }
    return `${this.selectionId}:${selector}`;
  }

  private getSelectionId() {
    if (this.element.hasAttribute('id')) {
      return this.element.getAttribute('id')!;
    }
    const newId = `el-${Selection.countID++}`;
    this.element.setAttribute('id', newId);
    return newId;
  }
}

function removeElement(element: AnyElement) {
  if (!element.parentElement) {
    return;
  }
  element.parentElement.removeChild(element);
}

function isBeingTransitioned(element: AnyElement, name: string) {
  const activeTransitions = getActiveTransitions(element);
  return Boolean(activeTransitions && activeTransitions[name]);
}

function startTransition(
  element: AnyElement,
  name: string,
  interpolator: (progress: number) => string,
  duration: number
) {
  const activeTransitions = getActiveTransitions(element, true);
  const previousTransition = activeTransitions[name];
  if (previousTransition) {
    stopAnimation(previousTransition.requestId);
  }

  startAnimation((progress) => {
    element.setAttribute(name, interpolator(progress));
  }, (requestId) => {
    activeTransitions[name] = {requestId};
  }, () => {
    activeTransitions[name] = undefined;
  }, duration);
}

function getActiveTransitions(
  element: AnyElement
): ActiveTransitions | undefined;
function getActiveTransitions(
  element: AnyElement,
  initialize: true
): ActiveTransitions;
function getActiveTransitions(element: AnyElement, initialize?: true) {
  const activeTransitions: ActiveTransitions | undefined = (
    (element as any)[ACTIVE_TRANSITIONS_PROPERTY]
  ) || initialize && (
    (element as any)[ACTIVE_TRANSITIONS_PROPERTY] = {}
  );
  return activeTransitions;
}

function isBeingRemoved(element: AnyElement): boolean {
  return Boolean((element as any)[BEING_REMOVED_PROPERTY]);
}

function startRemovingElement(element: AnyElement): void {
  element.removeAttribute('id');
  (element as any)[BEING_REMOVED_PROPERTY] = true;
}

function detectChanges<D extends TrackData>(
  element: AnyElement,
  nextData: D,
  dataType: DataType
): {[key in keyof D]?: boolean} | null {
  const data = getElementData<D>(element, dataType);
  if (!data) {
    (element as any)[DATA_CHANGES_PROPERTIES[dataType]] = map(
      nextData,
      value => value
    );
    return map(nextData, () => true);
  }
  if (data === nextData) {
    return null;
  }

  const changes: {[key in keyof D]?: boolean} = {};
  let isChanged: boolean | undefined;

  forEach(nextData, (nextValue, key) => {
    const value = data[key];
    if (value === nextValue) {
      return;
    }
    data[key] = nextValue;
    if (
      Array.isArray(value) &&
      Array.isArray(nextValue) &&
      isArrayEqual(value, nextValue)
    ) {
      return;
    }
    changes[key] = isChanged = true;
  });

  if (!isChanged) {
    return null;
  }
  return changes;
}

function getElementData<D extends TrackData>(
  element: AnyElement,
  dataType: DataType
): D | undefined {
  return (element as any)[DATA_CHANGES_PROPERTIES[dataType]];
}

function createChild<E extends AnyElement>(
  tagName: string,
  parent: AnyElement
): E {
  const elementDocument = parent.ownerDocument!;

  if (tagName === 'svg') {
    return (
      elementDocument.createElementNS(SVG_URI, tagName) as AnyElement as E
    );
  }
  if (
    parent.namespaceURI === XHTML_URI &&
    elementDocument.documentElement.namespaceURI === XHTML_URI
  ) {
    return elementDocument.createElement(tagName) as AnyElement as E;
  }
  return elementDocument.createElementNS(parent.namespaceURI, tagName) as E;
}
