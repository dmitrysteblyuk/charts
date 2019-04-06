import {forEach} from '../utils';
import {VirtualNode, VirtualNodeConnection} from './';

export type AnyElement = Element & ElementCSSInlineStyle & GlobalEventHandlers;

type Primitive = string | boolean | number | undefined | null;
type CommonProps = Dictionary<Primitive | SubProps>;
interface SubProps extends CommonProps {}
type Props = {style?: CSSProperties} & Dictionary<
  Primitive |
  ((event: Event) => void) |
  CommonProps
>;

export function connectToElement<E extends AnyElement>(
  element: E,
  props?: Props
) {
  return new VirtualDomElement(element.nodeName, props)
    .connectTo(new ElementConnection(element));
}

export class ElementConnection<E extends AnyElement = AnyElement>
implements VirtualNodeConnection<string, Props> {
  constructor(public element: E) {}

  addOne(
    tagName: string,
    initialProps?: Props,
    beforeConnection?: ElementConnection
  ) {
    const newElement = createChild(tagName, this.element);
    if (initialProps) {
      this.applyProps(newElement, initialProps, true);
    }

    if (beforeConnection) {
      this.element.insertBefore(newElement, beforeConnection.element);
    } else {
      this.element.appendChild(newElement);
    }
    return new ElementConnection(newElement);
  }

  removeOne({element}: ElementConnection) {
    this.element.removeChild(element);
  }

  updateProps(props: Props) {
    this.applyProps(this.element, props, false);
  }

  private applyProps(element: AnyElement, props: Props, isNew?: boolean) {
    forEach(props, (value, name) => {
      if (value == null) {
        if (isNew) {
          return;
        }

        if (isProperty(name)) {
          element['onclick'] = null;
        } else {
          element.removeAttribute(name);
        }
        return;
      }

      if (typeof value !== 'object') {
        if (typeof value === 'function') {
          (element as any)[name] = value;
        } else if (isProperty(name)) {
          element[name] = stringify(value);
        } else {
          element.setAttribute(name, stringify(value));
        }
        return;
      }

      if (name === 'style') {
        forEach(value, (styleValue, styleName) => {
          let convertedValue: string | null;

          if (styleValue == null) {
            convertedValue = null;
          } else if (typeof styleValue === 'object') {
            throw new Error(
              `Style "${styleName}" value cannot be an object.`
            );
          } else {
            convertedValue = stringify(styleValue);
          }

          element.style[styleName as keyof CSSProperties] = convertedValue;
        });
      }
    });
  }
}

function isProperty(name: string): name is 'textContent' | 'onclick' {
  return name === 'textContent' || name === 'value';
}

function stringify(value: string | number | boolean): string {
  return String(value);
}

const SVG_URI = 'http://www.w3.org/2000/svg';
const XHTML_URI = 'http://www.w3.org/1999/xhtml';

export function createChild(
  tagName: string,
  parent: AnyElement
): AnyElement {
  const elementDocument = parent.ownerDocument as Document;

  if (tagName === 'svg') {
    return elementDocument.createElementNS(SVG_URI, tagName);
  }
  if (
    parent.namespaceURI === XHTML_URI &&
    elementDocument.documentElement.namespaceURI === XHTML_URI
  ) {
    return elementDocument.createElement(tagName);
  }
  return (
    elementDocument.createElementNS(parent.namespaceURI, tagName) as AnyElement
  );
}

export class VirtualDomElement extends VirtualNode<string, Props> {
  protected detectChanges(props: Props, nextProps: Props): Props | undefined {
    const changes: Props = {};
    let isChanged: boolean | undefined;

    forEach(nextProps, (nextValue, name) => {
      const value = props[name];
      if (value === nextValue || value == null && nextValue == null) {
        return;
      }

      if (!(
        typeof nextValue === 'object' && nextValue &&
        typeof value === 'object' && value
      )) {
        props[name] = nextValue;
        changes[name] = nextValue;
        isChanged = true;
        return;
      }

      const subChanges = this.detectChanges(value, nextValue) as SubProps;
      if (!subChanges) {
        return;
      }
      changes[name] = subChanges;
      isChanged = true;
    });

    if (!isChanged) {
      return;
    }
    return changes;
  }
}
