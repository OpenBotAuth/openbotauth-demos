/**
 * Phase transition animations
 * Total duration: 1.5 seconds
 */

export const PHASE_TRANSITION_DURATION = 1500; // ms

export interface TransitionTimeline {
  productGridFade: number;
  cartShrinkMove: number;
  sequenceDiagramExpand: number;
  devtoolsSlideUp: number;
  avatarMorph: number;
  participantsShow: number;
  ready: number;
}

export const TRANSITION_TIMELINE: TransitionTimeline = {
  productGridFade: 0,        // T+0ms: Product grid fades + blurs
  cartShrinkMove: 300,       // T+300ms: Cart shrinks and moves
  sequenceDiagramExpand: 500, // T+500ms: Sequence diagram expands
  devtoolsSlideUp: 800,      // T+800ms: DevTools panel slides up
  avatarMorph: 1000,         // T+1000ms: Avatar morphs Pete → Penny
  participantsShow: 1200,    // T+1200ms: Participants appear
  ready: 1500,               // T+1500ms: Ready for interaction
};

/**
 * Trigger phase transition animation
 */
export function triggerPhaseTransition(
  onStep: (step: keyof TransitionTimeline) => void
): void {
  Object.entries(TRANSITION_TIMELINE).forEach(([step, delay]) => {
    setTimeout(() => {
      onStep(step as keyof TransitionTimeline);
    }, delay);
  });
}

/**
 * CSS classes for phase transitions
 */
export const ANIMATION_CLASSES = {
  productGridBlurred: 'opacity-20 blur-sm pointer-events-none',
  productGridNormal: 'opacity-100 blur-0',
  cartLocked: 'cart-panel locked',
  cartOpen: 'cart-panel open',
  sequenceDiagramExpanded: 'h-[70vh]',
  sequenceDiagramCollapsed: 'h-[30vh]',
  devtoolsVisible: 'translate-y-0 opacity-100',
  devtoolsHidden: 'translate-y-full opacity-0',
};

/**
 * Easing functions
 */
export const EASINGS = {
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

