'use client';

import * as React from 'react';

export type WithAsChild<T = object> = T & { asChild?: boolean };

type SlotProps = {
  children?: React.ReactNode;
  [key: string]: unknown;
};

/**
 * Merges props onto its single child (a minimal Radix Slot equivalent).
 */
export const Slot = React.forwardRef<HTMLElement, SlotProps>(function Slot(
  { children, ...props },
  ref,
) {
  const child = React.Children.only(children) as React.ReactElement;
  return React.cloneElement(child, {
    ...props,
    // @ts-expect-error — ref forwarding onto the child
    ref: (node: HTMLElement | null) => {
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node;
      const childRef = (child as { ref?: React.Ref<HTMLElement> }).ref;
      if (typeof childRef === 'function') childRef(node);
      else if (childRef) (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    onMouseEnter: mergeHandlers(
      (child.props as Record<string, unknown>).onMouseEnter as ((e: never) => void) | undefined,
      props.onMouseEnter as ((e: never) => void) | undefined,
    ),
    onMouseLeave: mergeHandlers(
      (child.props as Record<string, unknown>).onMouseLeave as ((e: never) => void) | undefined,
      props.onMouseLeave as ((e: never) => void) | undefined,
    ),
    onPointerDown: mergeHandlers(
      (child.props as Record<string, unknown>).onPointerDown as ((e: never) => void) | undefined,
      props.onPointerDown as ((e: never) => void) | undefined,
    ),
    onPointerUp: mergeHandlers(
      (child.props as Record<string, unknown>).onPointerUp as ((e: never) => void) | undefined,
      props.onPointerUp as ((e: never) => void) | undefined,
    ),
  });
});

function mergeHandlers<E>(
  a?: (e: E) => void,
  b?: (e: E) => void,
): ((e: E) => void) | undefined {
  if (!a) return b;
  if (!b) return a;
  return (e) => {
    a(e);
    b(e);
  };
}
