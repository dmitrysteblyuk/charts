import {map} from './utils';
import {detectChanges} from './detect-changes';

const DATUM_PROPERTY = '__DATUM__';
const BEING_REMOVED_PROPERTY = '__BEING_REMOVED__';
const SVG_URI = 'http://www.w3.org/2000/svg';
const XHTML_URI = 'http://www.w3.org/1999/xhtml';

type Primitive = string | boolean | number | null | undefined;
type Selector = number | string;
type Remover<E extends Element, D> = (
  (selection: Selection<E>, datum: D) => Promise<void> | void
);
type Updater<E extends Element> = (
  (selection: Selection<E>, isNew: boolean) => void
);

export class Selection<EL extends Element = Element> {
  static countID = 0;
  private selectionId: string;

  constructor(private element: EL) {
    if (element.hasAttribute('id')) {
      this.selectionId = element.getAttribute('id') as string;
      return;
    }
    this.selectionId = `el-${Selection.countID++}`;
    element.setAttribute('id', this.selectionId);
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

  getChanges<T>(data: T) {
    return detectChanges(this.element, data);
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
        this.removeElement(selection.element, remover);
      }
      return null;
    }

    let isNew = false;
    if (selection === null) {
      selection = this.addChild<E>(tagName, selector);
      isNew = true;
    }

    if (updater) {
      updater(selection, isNew);
    }
    return selection;
  }

  renderAll<E extends Element, D>(
    tagName: string,
    data: D[],
    updater?: (
      selection: Selection<E>,
      datum: D,
      isNew: boolean,
      previousDatum?: D
    ) => void,
    remover?: Remover<E, D>
  ) {
    const {children} = this.element;
    const currentLength = children.length;
    const toUpdate: {element: E; datum: D; }[] = [];
    const toRemove: E[] = [];
    let usedDataIndex = 0;

    for (let index = 0; index < currentLength; index++) {
      const element = children.item(index) as E;
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
      this.removeElement(element, remover);
    });

    toUpdate.forEach(({element, datum}) => {
      const previousDatum = getDatum<D>(element);
      setDatum(element, datum);
      if (updater) {
        updater(new Selection(element), datum, false, previousDatum);
      }
    });

    toAdd.forEach((datum) => {
      const selection = this.addChild<E>(tagName);
      setDatum(selection.element, datum);
      if (updater) {
        updater(selection, datum, true);
      }
    });
  }

  private addChild<E extends Element>(
    tagName: string,
    selector?: Selector
  ): Selection<E> {
    console.log('add new', tagName, Selection.countID);

    const parent = this.element;
    const element = createChild<E>(tagName, parent);

    if (typeof selector === 'string') {
      element.setAttribute('id', this.getChildId(selector));
    }
    if (typeof selector === 'number') {
      parent.insertBefore(element, parent.children.item(selector));
    } else {
      parent.appendChild(element);
    }
    return new Selection(element);
  }

  private removeElement<E extends Element, D>(
    element: E,
    remover?: Remover<E, D>
  ) {
    startRemovingElement(element);
    const whenDone = (
      remover && remover(new Selection(element), getDatum(element))
    );
    if (whenDone) {
      whenDone.then(done);
    } else {
      done();
    }

    function done() {
      if (element.parentElement === null) {
        return;
      }
      element.parentElement.removeChild(element);
    }
  }

  private getChildId(selector: string) {
    return `${this.selectionId}:${selector}`;
  }
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
