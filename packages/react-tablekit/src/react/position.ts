import type { Placement } from './types';

interface Size {
  width: number;
  height: number;
}

/**
 * Positions a floating element (`position: fixed`) next to an anchor rect, flipping to the
 * opposite side when it would overflow the viewport, and clamping into it.
 */
export function computePosition(
  anchor: DOMRect,
  floating: Size,
  placement: Placement,
  offset = 4,
  viewport: Size = { width: window.innerWidth, height: window.innerHeight },
): { top: number; left: number; placement: Placement } {
  const [side, align] = placement.split('-') as [
    'top' | 'bottom' | 'left' | 'right',
    'start' | 'end' | undefined,
  ];
  let actualSide = side;
  const fits = {
    top: anchor.top - floating.height - offset >= 0,
    bottom: anchor.bottom + floating.height + offset <= viewport.height,
    left: anchor.left - floating.width - offset >= 0,
    right: anchor.right + floating.width + offset <= viewport.width,
  };
  const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;
  if (!fits[side] && fits[opposite[side]]) actualSide = opposite[side];

  let top: number;
  let left: number;
  if (actualSide === 'top' || actualSide === 'bottom') {
    top = actualSide === 'top' ? anchor.top - floating.height - offset : anchor.bottom + offset;
    left =
      align === 'start'
        ? anchor.left
        : align === 'end'
          ? anchor.right - floating.width
          : anchor.left + anchor.width / 2 - floating.width / 2;
  } else {
    left = actualSide === 'left' ? anchor.left - floating.width - offset : anchor.right + offset;
    top = anchor.top + anchor.height / 2 - floating.height / 2;
  }
  const margin = 4;
  left = Math.min(
    Math.max(margin, left),
    Math.max(margin, viewport.width - floating.width - margin),
  );
  top = Math.min(
    Math.max(margin, top),
    Math.max(margin, viewport.height - floating.height - margin),
  );
  return {
    top: Math.round(top),
    left: Math.round(left),
    placement: (align ? `${actualSide}-${align}` : actualSide) as Placement,
  };
}
