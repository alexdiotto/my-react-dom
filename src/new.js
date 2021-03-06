// @flow

const hostConfig = {
  getRootHostContext(
    rootContainerInstance: Container,
  ): HostContext {
    let type;
    let namespace;
    const nodeType = rootContainerInstance.nodeType;
    switch (nodeType) {
    case DOCUMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE: {
      type = nodeType === DOCUMENT_NODE ? '#document' : '#fragment';
      let root = (rootContainerInstance: any).documentElement;
      namespace = root ? root.namespaceURI : getChildNamespace(null, '');
      break;
    }
    default: {
      const container: any =
            nodeType === COMMENT_NODE
            ? rootContainerInstance.parentNode
            : rootContainerInstance;
      const ownNamespace = container.namespaceURI || null;
      type = container.tagName;
      namespace = getChildNamespace(ownNamespace, type);
      break;
    }
    }
    if (__DEV__) {
      const validatedTag = type.toLowerCase();
      const ancestorInfo = updatedAncestorInfo(null, validatedTag, null);
      return {namespace, ancestorInfo};
    }
    return namespace;
  },

  getChildHostContext(
    parentHostContext: HostContext,
    type: string,
    rootContainerInstance: Container,
  ): HostContext {
    if (__DEV__) {
      const parentHostContextDev = ((parentHostContext: any): HostContextDev);
      const namespace = getChildNamespace(parentHostContextDev.namespace, type);
      const ancestorInfo = updatedAncestorInfo(
        parentHostContextDev.ancestorInfo,
        type,
        null,
      );
      return {namespace, ancestorInfo};
    }
    const parentNamespace = ((parentHostContext: any): HostContextProd);
    return getChildNamespace(parentNamespace, type);
  },

  getPublicInstance(instance: Instance): * {
    return instance;
  },

  prepareForCommit(containerInfo: Container): void {
    eventsEnabled = ReactBrowserEventEmitter.isEnabled();
    selectionInformation = ReactInputSelection.getSelectionInformation();
    ReactBrowserEventEmitter.setEnabled(false);
  },

  resetAfterCommit(containerInfo: Container): void {
    ReactInputSelection.restoreSelection(selectionInformation);
    selectionInformation = null;
    ReactBrowserEventEmitter.setEnabled(eventsEnabled);
    eventsEnabled = null;
  },

  createInstance(
    type: string,
    props: Props,
    rootContainerInstance: Container,
    hostContext: HostContext,
    internalInstanceHandle: Object,
  ): Instance {
    let parentNamespace: string;
    if (__DEV__) {
      // TODO: take namespace into account when validating.
      const hostContextDev = ((hostContext: any): HostContextDev);
      validateDOMNesting(type, null, hostContextDev.ancestorInfo);
      if (
        typeof props.children === 'string' ||
          typeof props.children === 'number'
      ) {
        const string = '' + props.children;
        const ownAncestorInfo = updatedAncestorInfo(
          hostContextDev.ancestorInfo,
          type,
          null,
        );
        validateDOMNesting(null, string, ownAncestorInfo);
      }
      parentNamespace = hostContextDev.namespace;
    } else {
      parentNamespace = ((hostContext: any): HostContextProd);
    }
    const domElement: Instance = createElement(
      type,
      props,
      rootContainerInstance,
      parentNamespace,
    );
    precacheFiberNode(internalInstanceHandle, domElement);
    updateFiberProps(domElement, props);
    return domElement;
  },

  appendInitialChild(
    parentInstance: Instance,
    child: Instance | TextInstance,
  ): void {
    parentInstance.appendChild(child);
  },

  finalizeInitialChildren(
    domElement: Instance,
    type: string,
    props: Props,
    rootContainerInstance: Container,
    hostContext: HostContext,
  ): boolean {
    setInitialProperties(domElement, type, props, rootContainerInstance);
    return shouldAutoFocusHostComponent(type, props);
  },

  prepareUpdate(
    domElement: Instance,
    type: string,
    oldProps: Props,
    newProps: Props,
    rootContainerInstance: Container,
    hostContext: HostContext,
  ): null | Array<mixed> {
    if (__DEV__) {
      const hostContextDev = ((hostContext: any): HostContextDev);
      if (
        typeof newProps.children !== typeof oldProps.children &&
          (typeof newProps.children === 'string' ||
           typeof newProps.children === 'number')
      ) {
        const string = '' + newProps.children;
        const ownAncestorInfo = updatedAncestorInfo(
          hostContextDev.ancestorInfo,
          type,
          null,
        );
        validateDOMNesting(null, string, ownAncestorInfo);
      }
    }
    return diffProperties(
      domElement,
      type,
      oldProps,
      newProps,
      rootContainerInstance,
    );
  },

  shouldSetTextContent(type: string, props: Props): boolean {
    return (
      type === 'textarea' ||
        typeof props.children === 'string' ||
        typeof props.children === 'number' ||
        (typeof props.dangerouslySetInnerHTML === 'object' &&
         props.dangerouslySetInnerHTML !== null &&
         typeof props.dangerouslySetInnerHTML.__html === 'string')
    );
  },

  shouldDeprioritizeSubtree(type: string, props: Props): boolean {
    return !!props.hidden;
  },

  createTextInstance(
    text: string,
    rootContainerInstance: Container,
    hostContext: HostContext,
    internalInstanceHandle: Object,
  ): TextInstance {
    if (__DEV__) {
      const hostContextDev = ((hostContext: any): HostContextDev);
      validateDOMNesting(null, text, hostContextDev.ancestorInfo);
    }
    const textNode: TextInstance = createTextNode(text, rootContainerInstance);
    precacheFiberNode(internalInstanceHandle, textNode);
    return textNode;
  },

  now: ReactScheduler.now,

  isPrimaryRenderer: true,
  scheduleDeferredCallback: '',
  cancelDeferredCallback: '',

  // -------------------
  //     Mutation
  // -------------------

  supportsMutation: true,

  commitMount(
    domElement: Instance,
    type: string,
    newProps: Props,
    internalInstanceHandle: Object,
  ): void {
    // Despite the naming that might imply otherwise, this method only
    // fires if there is an `Update` effect scheduled during mounting.
    // This happens if `finalizeInitialChildren` returns `true` (which it
    // does to implement the `autoFocus` attribute on the client). But
    // there are also other cases when this might happen (such as patching
    // up text content during hydration mismatch). So we'll check this again.
    if (shouldAutoFocusHostComponent(type, newProps)) {
      ((domElement: any):
       | HTMLButtonElement
       | HTMLInputElement
       | HTMLSelectElement
       | HTMLTextAreaElement).focus();
    }
  },

  commitUpdate(
    domElement: Instance,
    updatePayload: Array<mixed>,
    type: string,
    oldProps: Props,
    newProps: Props,
    internalInstanceHandle: Object,
  ): void {
    // Update the props handle so that we know which props are the ones with
    // with current event handlers.
    updateFiberProps(domElement, newProps);
    // Apply the diff to the DOM node.
    updateProperties(domElement, updatePayload, type, oldProps, newProps);
  },

  resetTextContent(domElement: Instance): void {
    setTextContent(domElement, '');
  },

  commitTextUpdate(
    textInstance: TextInstance,
    oldText: string,
    newText: string,
  ): void {
    textInstance.nodeValue = newText;
  },

  appendChild(
    parentInstance: Instance,
    child: Instance | TextInstance,
  ): void {
    parentInstance.appendChild(child);
  },

  appendChildToContainer(
    container: Container,
    child: Instance | TextInstance,
  ): void {
    if (container.nodeType === COMMENT_NODE) {
      (container.parentNode: any).insertBefore(child, container);
    } else {
      container.appendChild(child);
    }
  },

  insertBefore(
    parentInstance: Instance,
    child: Instance | TextInstance,
    beforeChild: Instance | TextInstance,
  ): void {
    parentInstance.insertBefore(child, beforeChild);
  },

  insertInContainerBefore(
    container: Container,
    child: Instance | TextInstance,
    beforeChild: Instance | TextInstance,
  ): void {
    if (container.nodeType === COMMENT_NODE) {
      (container.parentNode: any).insertBefore(child, beforeChild);
    } else {
      container.insertBefore(child, beforeChild);
    }
  },

  removeChild(
    parentInstance: Instance,
    child: Instance | TextInstance,
  ): void {
    parentInstance.removeChild(child);
  },

  removeChildFromContainer(
    container: Container,
    child: Instance | TextInstance,
  ): void {
    if (container.nodeType === COMMENT_NODE) {
      (container.parentNode: any).removeChild(child);
    } else {
      container.removeChild(child);
    }
  }
};
