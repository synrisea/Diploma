import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRoute } from '../../route/RouteContext';
import { Text } from '../ui/Text';
import { PulseDot } from '../ui/PulseDot';
import { SearchIcon } from '../ui/icons';
import { colors, fonts, shadows } from '../../theme/tokens';
import { errorMessage } from '../ui/Feedback';

export function RouteSearchBar() {
  const [wish, setWish] = useState('');
  const [focused, setFocused] = useState(false);
  const { planRoute, isPlanning, isError, error, hasEmptyResult, clearRoute } = useRoute();

  const showFeedback = isPlanning || isError || hasEmptyResult;

  const handleSubmit = () => {
    const trimmed = wish.trim();
    if (!trimmed || isPlanning) return;
    planRoute(trimmed);
  };

  return (
    <View className="relative min-w-0 flex-1">
      <View
        className={`flex-row items-center gap-1.5 rounded-full border bg-stone-900/[0.03] px-2.5 py-1 ${
          focused ? 'border-brand-500' : 'border-stone-900/10'
        }`}
      >
        <SearchIcon />
        <TextInput
          value={wish}
          onChangeText={(text) => {
            setWish(text);
            if (isError || hasEmptyResult) clearRoute();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          placeholder="Plan a route…"
          placeholderTextColor={colors.stone[500]}
          keyboardAppearance="dark"
          selectionColor={colors.brand[500]}
          editable={!isPlanning}
          accessibilityLabel="Plan a route"
          style={{ fontFamily: fonts.sans, color: colors.stone[900], fontSize: 14, paddingVertical: 4 }}
          className={`min-w-0 flex-1 ${isPlanning ? 'opacity-50' : ''}`}
        />
        {wish.trim().length > 0 && (
          <Pressable
            onPress={handleSubmit}
            disabled={isPlanning}
            className={`rounded-full bg-brand-500 px-2 py-0.5 active:bg-brand-600 ${isPlanning ? 'opacity-50' : ''}`}
          >
            <Text className="text-xs font-sans-medium text-brand-ink">{isPlanning ? '…' : 'Go'}</Text>
          </Pressable>
        )}
      </View>

      {showFeedback && (
        <View
          className="absolute left-0 top-11 z-50 w-72 max-w-full rounded-2xl border border-stone-900/10 bg-panel/95 px-4 py-3"
          style={shadows.panel}
        >
          {isPlanning && (
            <View className="flex-row items-center gap-2">
              <PulseDot />
              <Text className="font-mono text-[11px] uppercase tracking-[1px] text-stone-500">
                Reading the map… this can take a moment
              </Text>
            </View>
          )}
          {isError && <Text className="text-sm text-sentiment-negative">{errorMessage(error)}</Text>}
          {hasEmptyResult && (
            <Text className="text-sm text-stone-500">No places match that yet. Try rephrasing your wish.</Text>
          )}
        </View>
      )}
    </View>
  );
}
