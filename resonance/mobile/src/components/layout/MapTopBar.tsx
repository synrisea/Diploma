import { useRef } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAuth } from '../../auth/AuthContext';
import { useHeatmap } from '../../heatmap/HeatmapContext';
import { useDimensions } from '../../hooks/useDimensions';
import { useProfile } from '../../hooks/useProfile';
import { HeatmapControl } from '../map/HeatmapControl';
import { RouteSearchBar } from '../route/RouteSearchBar';
import { AccountMenu } from './AccountMenu';
import { SheetMenu } from './SheetMenu';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';
import { ChevronDownIcon, Logo } from '../ui/icons';
import { shadows } from '../../theme/tokens';

export const MAP_TOP_BAR_HEIGHT = 56;

function Divider() {
  return <View className="h-4 w-px bg-stone-900/10" />;
}

export function MapTopBar({ onLayoutHeight }: { onLayoutHeight: (height: number) => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, displayName } = useAuth();
  const { data: profile } = useProfile();
  const { mode, setMode } = useHeatmap();
  const { data: dimensions = [] } = useDimensions();
  const heatmapSheet = useRef<BottomSheetModal>(null);
  const accountSheet = useRef<BottomSheetModal>(null);

  const activeDimension = mode?.kind === 'dimension' ? dimensions.find((d) => d.id === mode.dimensionId) : null;
  const heatmapStatus = mode === null ? 'Off' : mode.kind === 'overall' ? 'Overall' : (activeDimension?.label ?? '…');

  const content = (
    <View
      className="flex-row items-center gap-2 border-b border-stone-900/10 px-4"
      style={{ paddingTop: insets.top + 8, paddingBottom: 8, minHeight: MAP_TOP_BAR_HEIGHT + insets.top }}
    >
      <View className="relative">
        <Logo size={24} />
        <View className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand-500" style={shadows.brandGlow} />
      </View>

      <Divider />

      <Pressable
        onPress={() => heatmapSheet.current?.present()}
        accessibilityRole="button"
        accessibilityLabel={`Heatmap, ${heatmapStatus}`}
        className="flex-row items-center gap-2 rounded-full px-2 py-1.5 active:opacity-75"
      >
        <View
          className={`h-1.5 w-1.5 rounded-full ${mode === null ? 'bg-stone-500' : 'bg-brand-500'}`}
          style={mode === null ? undefined : shadows.brandGlow}
        />
        <Text numberOfLines={1} className="max-w-[88px] font-mono text-[11px] uppercase tracking-[0.7px] text-stone-500">
          {heatmapStatus}
        </Text>
        <ChevronDownIcon />
      </Pressable>

      <Divider />

      <RouteSearchBar />

      {isAuthenticated ? (
        <Pressable
          onPress={() => accountSheet.current?.present()}
          accessibilityRole="button"
          accessibilityLabel="Account menu"
          className="active:opacity-80"
        >
          <Avatar displayName={displayName ?? '?'} avatarUrl={profile?.avatarUrl} size="md" shape="square" />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push('/login')}
          className="flex-row items-center gap-2 rounded-full bg-brand-500 py-1 pl-4 pr-1 active:bg-brand-600"
        >
          <Text className="text-sm font-sans-medium text-brand-ink">Log in</Text>
          <View className="h-6 w-6 items-center justify-center rounded-full bg-black/15">
            <Text className="text-xs text-brand-ink">↗</Text>
          </View>
        </Pressable>
      )}
    </View>
  );

  return (
    <>
      <View
        className="absolute left-0 right-0 top-0 z-50"
        style={shadows.panel}
        onLayout={(e) => onLayoutHeight(e.nativeEvent.layout.height)}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={40} tint="dark" style={{ backgroundColor: 'rgba(28, 24, 17, 0.8)' }}>
            {content}
          </BlurView>
        ) : (
          <View className="bg-panel/95">{content}</View>
        )}
      </View>

      <SheetMenu ref={heatmapSheet}>
        <HeatmapControl mode={mode} onModeChange={setMode} dimensions={dimensions} />
      </SheetMenu>

      {isAuthenticated && <AccountMenu ref={accountSheet} />}
    </>
  );
}
