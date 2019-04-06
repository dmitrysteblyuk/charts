import {List} from '../utils';

export interface VirtualNodeConnection<T, P> {
  addOne(
    type: T,
    initialProps?: P,
    beforeConnection?: VirtualNodeConnection<T, P>
  ): VirtualNodeConnection<T, P>;
  removeOne(childConnection: VirtualNodeConnection<T, P>): void;
  updateProps(props: P): void;
}

type DataNode<D, T extends VirtualNode<{}, {}>> = {
  getDatum(): D;
} & T;

type ConnectedNode<
  C extends VirtualNodeConnection<{}, {}>,
  T extends VirtualNode<{}, {}>
> = {
  getConnection(): C;
} & T;

export abstract class VirtualNode<T, P> {
  protected connection?: VirtualNodeConnection<T, P>;

  private datum: any;
  private groupByKey = new Map<string, string>();
  private groups = new Map<string, List<this>>();
  private children = new List<this>();
  private isBeingRemoved?: boolean;

  constructor(private type: T, private props?: P) {}

  connectTo<C extends VirtualNodeConnection<T, P>>(
    connection: C
  ): ConnectedNode<C, this> {
    if (this.connection === connection) {
      return this as ConnectedNode<C, this>;
    }

    if (this.props) {
      connection.updateProps(this.props);
    }
    this.connection = connection;

    const connectChildren = (parentNode: this) => {
      parentNode.children.forEach((node) => {
        node.connection = connection.addOne(node.type, node.props);
        connectChildren(node);
      });
    };
    connectChildren(this);

    return this as ConnectedNode<C, this>;
  }

  selectOne(key: string) {
    if (!this.children.has(key)) {
      return null;
    }
    const childNode = this.children.get(key);
    if (childNode.isBeingRemoved) {
      return null;
    }
    return childNode;
  }

  selectAll(groupKey: string) {
    const list = this.groups.get(groupKey);
    if (!list) {
      return [];
    }
    return list.getValues().filter(({isBeingRemoved}) => !isBeingRemoved);
  }

  updateProps(nextProps: P) {
    const {props} = this;
    let changes: P | undefined;

    if (props === undefined) {
      this.props = nextProps;
      changes = nextProps;
    } else {
      changes = this.detectChanges(props, nextProps);
    }
    changes && console.log('update props', changes);

    if (this.connection && changes) {
      this.connection.updateProps(changes);
    }
    return this;
  }

  renderAll<D>(
    type: T,
    groupKey: string,
    data: D[],
    getInitialProps?: (datum: D) => P,
    remover?: (node: DataNode<D, this>, callback: () => void) => void,
    getKey?: (datum: D) => string
  ): DataNode<D, this>[] {
    let currentNodes = this.groups.get(groupKey);
    if (!currentNodes) {
      currentNodes = new List<this>();
      this.groups.set(groupKey, currentNodes);
    }

    const result: DataNode<D, this>[] = [];
    const isToRender = getKey && <Dictionary<boolean>>{};
    const toRender = data.map((datum, index) => {
      const key = `${groupKey}:${getKey ? getKey(datum) : index}`;
      if (isToRender) {
        isToRender[key] = true;
      }
      return {key, datum};
    });

    const currentKeys = currentNodes.getKeys();
    const afterGroupKey = (
      currentKeys.length
        ? this.children.getNextKey(currentKeys[currentKeys.length - 1])
        : null
    );

    currentKeys.forEach((key, index) => {
      if (isToRender ? isToRender[key] : index < data.length) {
        return;
      }
      this.removeOne(key, remover);
    });

    for (let index = 0; index < toRender.length; index++) {
      const {key, datum} = toRender[index];

      if (getKey ? currentNodes.has(key) : index < currentKeys.length) {
        const destinationKey = getKey ? key : currentKeys[index];
        const node = currentNodes.get(destinationKey);
        node.datum = datum;

        if (destinationKey !== key) {
          currentNodes.replace(destinationKey, key, node);
          this.children.replace(destinationKey, key, node);
        }
        result.push(node);
        continue;
      }

      const nextKey = (
        index < toRender.length - 1
          ? toRender[index + 1].key
          : null
      );
      let beforeKey: string | null;
      let groupBeforeKey: string | null;

      if (nextKey !== null && currentNodes.has(nextKey)) {
        beforeKey = groupBeforeKey = nextKey;
      } else {
        beforeKey = afterGroupKey;
        groupBeforeKey = null;
      }

      const initialProps = getInitialProps && getInitialProps(datum);
      const newNode = this.addOne(type, key, initialProps, beforeKey);
      newNode.datum = datum;

      currentNodes.set(key, newNode, groupBeforeKey);
      this.groupByKey.set(key, groupKey);
      result.push(newNode);
    }

    return result;
  }

  renderOne(
    type: T,
    key: string,
    initialProps?: P,
    beforeKey?: string | null
  ): this {
    const node = this.selectOne(key);
    if (node !== null) {
      return node;
    }
    return this.addOne(type, key, initialProps, beforeKey);
  }

  removeOne(
    key: string,
    remover?: (node: this, callback: () => void) => void
  ) {
    const node = this.selectOne(key);
    if (!node) {
      return;
    }

    const done = () => {
      this.children.delete(key);

      if (this.groupByKey.has(key)) {
        this.groups.get(this.groupByKey.get(key)).delete(key);
        this.groupByKey.delete(key);
      }

      if (this.connection && node.connection) {
        this.connection.removeOne(node.connection);
      }
    };

    if (!remover) {
      done();
      return;
    }
    node.isBeingRemoved = true;
    remover(node, done);
  }

  getConnection(): VirtualNodeConnection<T, P> | undefined {
    return this.datum;
  }

  getDatum(): any {
    return this.datum;
  }

  private addOne(
    type: T,
    key: string,
    initialProps?: P,
    beforeKey?: string | null
  ): this {
    const ThisClass = this.constructor as new (type: T, props?: P) => this;
    const newNode = new ThisClass(type, initialProps);
    this.children.set(key, newNode, beforeKey);
    console.log('add one', type, key, beforeKey);

    if (this.connection) {
      const beforeConnection = (
        beforeKey != null && this.children.has(beforeKey)
          ? this.children.get(beforeKey).connection
          : undefined
      );
      newNode.connection = this.connection.addOne(
        type,
        initialProps,
        beforeConnection
      );
    }
    return newNode;
  }

  protected abstract detectChanges(props: P, nextProps: P): P | undefined;
}
