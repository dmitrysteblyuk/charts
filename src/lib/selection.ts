import {EventEmitter} from './event-emitter';
import './selection.css';

const DEFAULT_ANIMATION_DURATION = 500;
type AnyElement = Element & ElementCSSInlineStyle & GlobalEventHandlers;
type Primitive = string | boolean | number | undefined;
type EventOptions = boolean | AddEventListenerOptions;
type Key = string | number;

const defaultToggleClassNames = ['fade', 'appear'];

export class Selection<T extends AnyElement = AnyElement> {
  private childrenByKey: Dictionary<Selection, Key> = {};
  private styles?: CSSProperties;
  private attrs?: Dictionary<Primitive>;
  private eventEmitters: Dictionary<EventEmitter<Event, EventOptions>> = {};
  private textValue?: Primitive;
  private hideTimerId: number | null = null;
  private toggleClassName: string | undefined;

  constructor(
    public tagName: string,
    private connectedElement?: T
  ) {}

  bootstrap(element: AnyElement) {
    element.innerHTML = this.getStaticMarkup();
    this.connectToElement(getElementChildren(element)[0] as T);
  }

  getStaticMarkup() {
    const result: Primitive[] = [`<${this.tagName}`];

    if (this.attrs) {
      for (const name in this.attrs) {
        const value = this.attrs[name];
        if (value !== undefined) {
          result.push(` ${name}="${escapeHTML(value)}"`);
        }
      }
    }

    if (this.styles) {
      const all: string[] = [];
      for (const name in this.styles) {
        const value = getStyle(this.styles, name);
        if (value !== null) {
          all.push(`${name}:${value}`);
        }
      }
      if (all.length) {
        result.push(` style="${all.join(';')}"`)
      }
    }
    result.push('>', escapeHTML(this.textValue));
    for (const key in this.childrenByKey) {
      result.push(this.childrenByKey[key].getStaticMarkup());
    }
    result.push(`</${this.tagName}>`);

    return result.join('');
  }

  connectToElement(element: T) {
    this.connectedElement = element;
    this.bindEventListeners();

    let index = 0;
    const children = getElementChildren(element);
    for (const key in this.childrenByKey) {
      this.childrenByKey[key].connectToElement(
        children[index++] as AnyElement
      );
    }
  }

  applyToElement(element: T) {
    if (this.styles) {
      for (const name in this.styles) {
        const value = getStyle(this.styles, name);
        if (value !== null) {
          setStyle(element.style, name, value);
        }
      }
    }

    if (this.attrs) {
      for (const name in this.attrs) {
        const value = this.attrs[name];
        if (value !== undefined) {
          element.setAttribute(name, String(value));
        }
      }
    }

    if (this.textValue !== undefined) {
      element.textContent = String(this.textValue);
    }

    for (const key in this.childrenByKey) {
      const childSelection = this.childrenByKey[key];
      const childElement = createAndAppendChild(
        childSelection.tagName!,
        element
      );
      childSelection.applyToElement(childElement);
    }
    this.connectedElement = element;
    this.bindEventListeners();
  }

  private bindEventListeners() {
    for (const name in this.eventEmitters) {
      this.eventEmitters[name].forEach((listener, options) => {
        this.connectedElement!.addEventListener(name, listener, options);
      });
    }
  }

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

    const newChild = new Selection(tagName, element);
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
        if (value === undefined) {
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
      const value = getStyle(newStyles, name);
      if (checkChanges && getStyle(styles, name) === value) {
        continue;
      }
      setStyle(styles, name, value);

      if (connectedElement) {
        setStyle(connectedElement.style, name, value);
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
      this.connectedElement.textContent = String(innerText);
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

  hasDescendant(element: AnyElement | null) {
    const {connectedElement} = this;
    if (!connectedElement) {
      return false;
    }
    for (
      let parentElement = element;
      parentElement;
      {parentElement} = parentElement
    ) {
      if (parentElement === connectedElement) {
        return true;
      }
    }
    return false;
  }

  toggle(
    shouldShow: boolean,
    classNames: string[] = defaultToggleClassNames,
    timeout = DEFAULT_ANIMATION_DURATION
  ) {
    if (this.hideTimerId !== null) {
      if (!shouldShow) {
        return this;
      }

      clearTimeout(this.hideTimerId);
      this.hideTimerId = null;
    } if (shouldShow) {
      this.setStyles({'display': null});
    } else {
      this.hideTimerId = setTimeout(() => {
        this.hideTimerId = null;
        this.setStyles({'display': 'none'});
      }, timeout);
    }

    const nextClassName = classNames[+shouldShow];
    const {toggleClassName} = this;
    this.toggleClassName = nextClassName;

    if (
      toggleClassName === nextClassName ||
      toggleClassName === undefined
    ) {
      return this;
    }

    const classes = this.attrs && this.attrs['class'] as string | undefined;
    return this.setAttrs({
      'class': (
        classes &&
        classes.replace(
          new RegExp(`(\\s*)\\b(${classNames.join('|')})\\b|$`),
          ` ${nextClassName}`
        ) ||
        nextClassName
      )
    });
  }
}

function getElementChildren(element: AnyElement) {
  return element.children || element.childNodes;
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

function escapeHTML(value: Primitive): Primitive {
  if (typeof value !== 'string') {
    return value;
  }
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getStyle(styles: CSSProperties, name: string): string | null {
  return (styles as any)[name];
}

function setStyle(styles: CSSProperties, name: string, value: string | null) {
  (styles as any)[name] = value;
}
