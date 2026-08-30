import { create } from "zustand";
import { Lang } from "../i18n/i18n";

export type ThemeName = "win11-dark" | "win11-light" | "win-default" | "crimson" | "azure";

export interface AvailabilityHours {
  enabled: boolean;
  openTime: string; // "HH:MM" 24h
  closeTime: string; // "HH:MM" 24h
  activeDays: number[]; // 0=Sunday .. 6=Saturday
}

interface AppState {
  lang: Lang;
  theme: ThemeName;
  commandPaletteOpen: boolean;
  activeSection: string;
  availability: AvailabilityHours;

  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeName) => void;
  toggleCommandPalette: (open?: boolean) => void;
  setActiveSection: (section: string) => void;
  setAvailability: (hours: Partial<AvailabilityHours>) => void;
}

const defaultAvailability: AvailabilityHours = {
  enabled: false,
  openTime: "09:00",
  closeTime: "18:00",
  activeDays: [0, 1, 2, 3, 4], // Sun-Thu by default; fully user editable
};

export const useAppStore = create<AppState>((set) => ({
  lang: "en",
  theme: "win11-dark",
  commandPaletteOpen: false,
  activeSection: "overview",
  availability: defaultAvailability,

  setLang: (lang) => set({ lang }),
  setTheme: (theme) => set({ theme }),
  toggleCommandPalette: (open) =>
    set((s) => ({ commandPaletteOpen: open ?? !s.commandPaletteOpen })),
  setActiveSection: (section) => set({ activeSection: section }),
  setAvailability: (hours) =>
    set((s) => ({ availability: { ...s.availability, ...hours } })),
}));

/**
 * Given the current availability config, compute whether NEXUS is
 * "open" right now and how long remains until the next opening.
 * Entirely derived from user-provided open/close times and active days.
 */
export function computeAvailability(hours: AvailabilityHours, now: Date = new Date()) {
  if (!hours.enabled) {
    return { isOpen: true, msUntilNextOpen: 0 };
  }

  const [openH, openM] = hours.openTime.split(":").map(Number);
  const [closeH, closeM] = hours.closeTime.split(":").map(Number);

  const todayOpen = new Date(now);
  todayOpen.setHours(openH, openM, 0, 0);
  const todayClose = new Date(now);
  todayClose.setHours(closeH, closeM, 0, 0);

  const isActiveDay = hours.activeDays.includes(now.getDay());
  const isOpen = isActiveDay && now >= todayOpen && now < todayClose;

  if (isOpen) {
    return { isOpen: true, msUntilNextOpen: 0 };
  }

  // Find the next active day (including today, if opening is still ahead)
  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(openH, openM, 0, 0);
    const dayIndex = candidate.getDay();
    if (hours.activeDays.includes(dayIndex) && candidate > now) {
      return { isOpen: false, msUntilNextOpen: candidate.getTime() - now.getTime() };
    }
  }

  return { isOpen: false, msUntilNextOpen: 0 };
}
