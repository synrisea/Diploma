import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Href } from 'expo-router';
import { BackButton } from './BackButton';
import { Label } from '../ui/Label';
import { Text } from '../ui/Text';

interface ScreenProps {
  eyebrow?: string;
  title?: string;
  back?: boolean;
  backFallback?: Href;
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  contentClassName?: string;
}

export function ScreenTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View>
      <Label>{eyebrow}</Label>
      <Text className="mt-1 font-display text-3xl text-stone-900">{title}</Text>
    </View>
  );
}

export function Screen({
  eyebrow,
  title,
  back = true,
  backFallback,
  headerRight,
  children,
  footer,
  scroll = true,
  refreshControl,
  contentClassName,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const header = (
    <View className="gap-6">
      {(back || headerRight) && (
        <View className="flex-row items-center justify-between">
          {back ? <BackButton fallback={backFallback} /> : <View />}
          {headerRight}
        </View>
      )}
      {eyebrow && title && <ScreenTitle eyebrow={eyebrow} title={title} />}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={`gap-6 px-6 pb-10 ${contentClassName ?? ''}`}
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {header}
      {children}
    </ScrollView>
  ) : (
    <View className={`flex-1 gap-6 px-6 ${contentClassName ?? ''}`} style={{ paddingTop: insets.top + 16 }}>
      {header}
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-ground"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {body}
      {footer}
    </KeyboardAvoidingView>
  );
}
