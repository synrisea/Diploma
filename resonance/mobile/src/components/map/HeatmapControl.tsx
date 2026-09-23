import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import type { Dimension } from '../../types/dimensions';
import type { HeatmapMode } from './heatmapPoints';
import { Text } from '../ui/Text';
import { SectionLabel } from '../ui/Label';

interface HeatmapControlProps {
  mode: HeatmapMode | null;
  onModeChange: (mode: HeatmapMode | null) => void;
  dimensions: Dimension[];
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`rounded-full border px-3 py-2 active:opacity-75 ${
        active ? 'border-brand-500 bg-brand-500' : 'border-stone-900/15 bg-stone-900/5'
      }`}
    >
      <Text className={`font-mono text-[11px] uppercase tracking-[0.7px] ${active ? 'text-brand-ink' : 'text-stone-500'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-1.5 w-1.5 rounded-full ${colorClass}`} />
      <Text className="font-mono text-[10px] text-stone-500">{label}</Text>
    </View>
  );
}

export function HeatmapControl({ mode, onModeChange, dimensions }: HeatmapControlProps) {
  const sortedDimensions = useMemo(() => [...dimensions].sort((a, b) => b.commentCount - a.commentCount), [dimensions]);

  const activeDimension = mode?.kind === 'dimension' ? sortedDimensions.find((d) => d.id === mode.dimensionId) : null;

  return (
    <View className="px-5 pb-6 pt-2">
      <SectionLabel className="mb-3 tracking-[2.2px]">Heatmap</SectionLabel>

      <View className="flex-row flex-wrap gap-1.5">
        <Pill label="Off" active={mode === null} onPress={() => onModeChange(null)} />
        <Pill label="Overall" active={mode?.kind === 'overall'} onPress={() => onModeChange({ kind: 'overall' })} />
        {sortedDimensions.map((dimension) => (
          <Pill
            key={dimension.id}
            label={dimension.label}
            active={mode?.kind === 'dimension' && mode.dimensionId === dimension.id}
            onPress={() => onModeChange({ kind: 'dimension', dimensionId: dimension.id })}
          />
        ))}
      </View>

      {mode !== null && (
        <View className="mt-3 flex-row items-center gap-3 border-t border-stone-900/10 pt-2.5">
          {(mode.kind === 'overall' || activeDimension?.sentiment === 'positive') && (
            <LegendItem colorClass="bg-sentiment-positive" label="Positive" />
          )}
          {(mode.kind === 'overall' || activeDimension?.sentiment === 'negative') && (
            <LegendItem colorClass="bg-sentiment-negative" label="Negative" />
          )}
          {activeDimension?.sentiment === 'mixed' && <LegendItem colorClass="bg-sentiment-mixed" label="Mixed" />}
        </View>
      )}
    </View>
  );
}
