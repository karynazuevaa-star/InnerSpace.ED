import { createContext, useContext, useState, type ReactNode } from 'react';

// Steps 0-3 point at a nav link (avatar/rooms/materials/tests) - matching
// TopNav's own left-to-right order (Home/Avatar/Rooms/Materials/Tests).
// Rooms was missing from this tour entirely at first (requested directly
// to fix: the "explore the site" tour skipped straight from Avatar to
// Materials) - inserted at index 1 to match where it actually sits in the
// nav, not appended at the end. Step 4 is a closing disclaimer with no
// nav target of its own.
export type TourStep = 0 | 1 | 2 | 3 | 4;
export const TOUR_NAV_TARGETS: readonly ['avatar', 'rooms', 'materials', 'tests'] = [
  'avatar',
  'rooms',
  'materials',
  'tests',
];
const LAST_STEP: TourStep = 4;

interface TourContextValue {
  step: TourStep | null;
  start: () => void;
  next: () => void;
  finish: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<TourStep | null>(null);

  const value: TourContextValue = {
    step,
    start: () => setStep(0),
    next: () => setStep((s) => (s === null || s >= LAST_STEP ? null : ((s + 1) as TourStep))),
    finish: () => setStep(null),
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
