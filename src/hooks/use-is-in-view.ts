'use client';

import * as React from 'react';
import { useInView, type UseInViewOptions } from 'motion/react';

type UseIsInViewOptions = {
  inView?: boolean;
  inViewOnce?: boolean;
  inViewMargin?: UseInViewOptions['margin'];
};

/**
 * Returns a ref to attach to an element and whether it is in view.
 * When `inView` is false, `isInView` stays false and no observer is attached.
 */
export function useIsInView<T extends HTMLElement>(
  outerRef: React.RefObject<T | null>,
  { inView = false, inViewOnce = false, inViewMargin }: UseIsInViewOptions = {},
) {
  const ref = React.useRef<T>(null);
  const isInView = useInView(ref, {
    once: inViewOnce,
    margin: inViewMargin,
  });

  // Keep the outer ref in sync so callers can also observe the node.
  React.useEffect(() => {
    if (outerRef && 'current' in outerRef) {
      (outerRef as React.MutableRefObject<T | null>).current = ref.current;
    }
  });

  return { ref, isInView: inView ? isInView : false };
}
