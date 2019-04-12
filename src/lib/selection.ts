import {EventEmitter} from './event-emitter';

type AnyElement = Element & ElementCSSInlineStyle & GlobalEventHandlers;
type Primitive = string | boolean | number | null | undefined;
type EventOptions = boolean | AddEventListenerOptions;
type Key = string | number;

export class Selection<T extends AnyElement = AnyElement> {
  private childrenByKey: Dictionary<Selection, Key> = {};
  private styles?: CSSProperties;
  private attrs?: Dictionary<Primitive>;
  private eventEmitters: Dictionary<EventEmitter<Event, EventOptions>> = {};
  private textValue?: Primitive;

  constructor(
    private connectedElement?: T,
    public tagName?: string
  ) {}

  selectOne<E extends AnyElement>(key: Key): Selection<E> | undefined {
    return this.childrenByKey[key] as Selection<E> | undefined;
  }

  renderOne<E extends AnyElement>(
    tagName: string,
    key: Key,
    onInitialRender?: (newChild: Selection<E>) => void
  ): Selection<E> {
    const child = this.selectOne<E>(key);
    if (child) {
      return child;
    }

    const element = (
      this.connectedElement &&
      createAndAppendChild<E>(tagName, this.connectedElement)
    );

    const newChild = new Selection(element, tagName);
    this.childrenByKey[key] = newChild;
    // console.log('render new', tagName, key);

    if (onInitialRender) {
      onInitialRender(newChild);
    }

    return newChild;
  }

  on<E extends Event = Event>(
    name: string,
    listener: (event: E) => void,
    options?: EventOptions
  ): this {
    const emitter = this.eventEmitters[name] || (
      this.eventEmitters[name] = new EventEmitter()
    );
    emitter.on(listener as (event: Event) => void, options);

    if (!this.connectedElement) {
      return this;
    }
    // console.log('bind event', name);

    this.connectedElement.addEventListener(
      name,
      listener as (event: Event) => void,
      options
    );
    return this;
  }

  setAttrs(newAttrs: Dictionary<Primitive>): this {
    let checkChanges = true;
    const attrs = this.attrs || (checkChanges = false, this.attrs = {});
    const {connectedElement} = this;

    for (const name in newAttrs) {
      const value = newAttrs[name];
      if (checkChanges && attrs[name] === value) {
        continue;
      }
      attrs[name] = value;

      if (connectedElement) {
        if (value == null) {
          connectedElement.removeAttribute(name);
        } else {
          connectedElement.setAttribute(name, String(value));
        }
        // console.log('update attr', name, value);
      }
    }
    return this;
  }

  setStyles(newStyles: CSSProperties): this {
    let checkChanges = true;
    const styles = this.styles || (checkChanges = false, this.styles = {});
    const {connectedElement} = this;

    for (const name in newStyles) {
      const value = (newStyles as any)[name];
      if (checkChanges && (styles as any)[name] === value) {
        continue;
      }
      (styles as any)[name] = value;

      if (connectedElement) {
        connectedElement.style[name as any] = value;
        // console.log('update style', name, value);
      }
    }
    return this;
  }

  text(innerText: Primitive): this {
    if (this.textValue === innerText) {
      return this;
    }

    this.textValue = innerText;
    this.childrenByKey = {};

    if (this.connectedElement) {
      const value = innerText == null ? null : String(innerText);
      this.connectedElement.textContent = value;
    }
    return this;
  }

  getRect(): Rect | undefined {
    return (
      this.connectedElement &&
      this.connectedElement.getBoundingClientRect()
    );
  }

  getContext(this: Selection<HTMLCanvasElement>) {
    return this.connectedElement && this.connectedElement.getContext('2d');
  }

  isConnectedTo(element: AnyElement) {
    return this.connectedElement === element;
  }
}

const SVG_URI = 'http://www.w3.org/2000/svg';
const XHTML_URI = 'http://www.w3.org/1999/xhtml';

function createAndAppendChild<E extends AnyElement>(
  tagName: string,
  parent: AnyElement
): E {
  const child = createChild<E>(tagName, parent);
  parent.appendChild(child);
  return child;
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
