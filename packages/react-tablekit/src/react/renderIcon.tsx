import { createElement, isValidElement, type ComponentType, type ReactNode } from 'react';
import type { IconProps, TableIcon } from '../icons';

/** Renders an icon given as a node or a component. */
export function renderIcon(icon: TableIcon, props: IconProps = {}): ReactNode {
  if (icon === null || icon === undefined || typeof icon === 'boolean') return null;
  if (
    typeof icon === 'function' ||
    (typeof icon === 'object' && !isValidElement(icon) && '$$typeof' in icon)
  ) {
    return createElement(icon as ComponentType<IconProps>, { 'aria-hidden': true, ...props });
  }
  return icon as ReactNode;
}
