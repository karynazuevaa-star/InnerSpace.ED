import { createContext, useContext, useState, type ReactNode } from 'react';

// Steps 0-2 point at a nav link (avatar/materials/tests). Step 3 is a
// closing disclaimer with no nav target of its own.
export type TourStep = 0 | 1 | 2 | 3;
export const TOUR_NAV_TARGETS: readonly ['avatar', 'materials', 'tests'] = ['avatar', 'materials', 'tests'];
const LAST_STEP: TourStep = 3;

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
