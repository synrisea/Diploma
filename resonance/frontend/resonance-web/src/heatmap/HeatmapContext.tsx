import { createContext, useContext, useState, type ReactNode } from 'react';
import type { HeatmapMode } from '../components/map/heatmapPoints';

interface HeatmapContextValue {
  mode: HeatmapMode | null;
  setMode: (mode: HeatmapMode | null) => void;
}

const HeatmapContext = createContext<HeatmapContextValue | undefined>(undefined);

export function HeatmapProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<HeatmapMode | null>(null);

  return <HeatmapContext.Provider value={{ mode, setMode }}>{children}</HeatmapContext.Provider>;
}

export function useHeatmap(): HeatmapContextValue {
  const ctx = useContext(HeatmapContext);
  if (!ctx) throw new Error('useHeatmap must be used within HeatmapProvider');
  return ctx;
}
