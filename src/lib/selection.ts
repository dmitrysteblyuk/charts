import {map} from './utils';

const DATUM_PROPERTY = '__DATUM__';
const BEING_REMOVED_PROPERTY = '__BEING_REMOVED__';
const SVG_URI = 'http://www.w3.org/2000/svg';
const XHTML_URI = 'http://www.w3.org/1999/xhtml';

type Primitive = string | boolean | number | null | undefined;

export class Selection<EL extends Element = Element> {
  constructor(private element: EL) {}

  getElement() {
    return this.element;
  }

  getRect() {
    const {width, height, left, top} = this.element.getBoundingClientRect();
    return {width, height, left, top};
  }

  getRoundedRect() {
    return map(this.getRect(), Math.round);
  }

  text(text: Primitive): this {
    this.element.textContent = text == null ? null : String(text);
    return this;
  }

  attr(name: string): string | null;
  attr(name: string, value: Primitive): this;
  attr(name: string, value?: Primitive): this | string | null {
    if (arguments.length < 2) {
      return this.element.getAttribute(name);
    }
    if (value == null) {
      this.element.removeAttribute(name);
    } else {
      this.element.setAttribute(name, String(value));
    }
    return this;
  }

  on(eventName: string, listener: (event: Event) => void): this {
    this.element.addEventListener(eventName, listener);
    return this;
  }

  off(eventName: string, listener: (event: Event) => void): this {
    this.element.removeEventListener(eventName, listener);
    return this;
  }

  renderOne<E extends Element>(
    selector: string | number,
    creator: string | ((parent: Element) => E),
    updater?: (selection: Selection<E>, isNew: boolean) => void
  ): Selection<E> {
    let element = (
      typeof selector === 'string'
        ? this.element.querySelector(selector)
        : this.element.children.item(selector)
    ) as (E | null);
    let isNew = false;

    if (element === null) {
      element = addElement(creator, this.element);
      isNew = true;
    }

    const selection = new Selection(element);
    if (updater) {
      updater(selection, isNew);
    }
    return selection;
  }

  renderAll<E extends Element, D>(
    data: D[],
    creator: string | ((parent: Element) => E),
    updater?: (
      selection: Selection<E>,
      datum: D,
      isNew: boolean,
      previousDatum?: D
    ) => void,
    remover?: (selection: Selection<E>, datum: D) => Promise<void> | void,
    selector?: string
  ) {
    const elements = (
      selector === undefined
        ? this.element.children
        : this.element.querySelectorAll(selector)
    );

    const currentLength = elements.length;
    const toUpdate: {element: E; datum: D; }[] = [];
    const toRemove: E[] = [];
    let usedDataIndex = 0;

    for (let index = 0; index < currentLength; index++) {
      const element = elements.item(index) as E;
      if (isBeingRemoved(element)) {
        continue;
      }

      if (usedDataIndex < data.length) {
        const datum = data[usedDataIndex++];
        toUpdate.push({element, datum});
      } else {
        toRemove.push(element);
      }
    }
    const toAdd = data.slice(usedDataIndex);

    toRemove.forEach((element) => {
      startRemovingElement(element);
      function done() {
        if (element.parentElement === null) {
          return;
        }
        element.parentElement.removeChild(element);
      }

      const whenDone = remover && remover(
        new Selection(element),
        getDatum(element)
      );
      if (whenDone !== undefined) {
        whenDone.then(done);
      } else {
        done();
      }
    });

    toUpdate.forEach(({element, datum}) => {
      const previousDatum = getDatum<D>(element);
      setDatum(element, datum);
      if (updater) {
        updater(new Selection(element), datum, false, previousDatum);
      }
    });

    toAdd.forEach((datum) => {
      const element = addElement(creator, this.element);
      setDatum(element, datum);

      if (updater) {
        updater(new Selection(element), datum, true);
      }
    });
  }
}

export function addElement<E extends Element = Element>(
  creator: string | ((parent: Element) => E),
  parent: Element
): E {
  console.log('add new', creator);
  const newElement = (
    typeof creator === 'string'
      ? createOne<E>(creator, parent)
      : creator(parent)
  );
  if (newElement.parentElement === null) {
    parent.appendChild(newElement);
  }
  return newElement;
}

function getDatum<D>(element: Element): D {
  return (element as any)[DATUM_PROPERTY];
}

function setDatum<D>(element: Element, datum: D): void {
  (element as any)[DATUM_PROPERTY] = datum;
}

function isBeingRemoved(element: Element): boolean {
  return Boolean((element as any)[BEING_REMOVED_PROPERTY]);
}

function startRemovingElement(element: Element): void {
  (element as any)[BEING_REMOVED_PROPERTY] = true;
}

function createOne<E extends Element>(
  name: string,
  parent: Element
): E {
  const elementDocument = parent.ownerDocument as Document;

  if (name === 'svg') {
    return elementDocument.createElementNS(SVG_URI, name) as Element as E;
  }

  if (
    parent.namespaceURI === XHTML_URI &&
    elementDocument.documentElement.namespaceURI === XHTML_URI
  ) {
    return elementDocument.createElement(name) as Element as E;
  }

  return elementDocument.createElementNS(parent.namespaceURI, name) as E;
}
