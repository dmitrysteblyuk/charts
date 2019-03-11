const DATUM_PROPERTY = '__datum__';
const BEING_REMOVED_PROPERTY = '__being_removed__';
const SVG_URI = 'http://www.w3.org/2000/svg';
const XHTML_URI = 'http://www.w3.org/1999/xhtml';

export function renderOne<E extends Element>(
  context: Element,
  selector: string | number,
  creator: string | ((context: Element) => E),
  updater?: (element: E, isNew: boolean) => void
): E {
  let element = (
    typeof selector === 'string'
      ? context.querySelector(selector)
      : context.children.item(selector)
  ) as (E | null);
  let isNew = false;

  if (element === null) {
    element = addElement(creator, context);
    isNew = true;
  }
  if (updater) {
    updater(element, isNew);
  }
  return element
}

export function renderAll<E extends Element, D>(
  context: Element,
  data: D[],
  creator: string | ((context: Element) => E),
  updater?: (element: E, datum: D, isNew: boolean, previousDatum?: D) => void,
  remover?: (element: E, datum: D) => Promise<void> | void,
  selector?: string
) {
  const elements = (
    selector === undefined
      ? context.children
      : context.querySelectorAll(selector)
  );

  const currentLength = elements.length;
  const toUpdate: {element: E; datum: D;}[] = [];
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

    const whenDone = remover && remover(element, getDatum(element));
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
      updater(element, datum, false, previousDatum);
    }
  });

  toAdd.forEach((datum) => {
    const element = addElement(creator, context);
    setDatum(element, datum);

    if (updater) {
      updater(element, datum, true);
    }
  });
}

function addElement<E extends Element = Element>(
  creator: string | ((context: Element) => E),
  context: Element
): E {
  console.log('add new', creator);
  const newElement = (
    typeof creator === 'string'
      ? createOne<E>(creator, context)
      : creator(context)
  );
  if (newElement.parentElement === null) {
    context.appendChild(newElement);
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
  context: Element
): E {
  const elementDocument = context.ownerDocument!;

  if (name === 'svg') {
    return elementDocument.createElementNS(SVG_URI, name) as Element as E;
  }

  if (
    context.namespaceURI === XHTML_URI &&
    elementDocument.documentElement.namespaceURI === XHTML_URI
  ) {
    return elementDocument.createElement(name) as Element as E;
  }

  return elementDocument.createElementNS(context.namespaceURI, name) as E;
}
