import { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { Text } from '../ui/Text';

type Tone = 'muted' | 'danger';

const TONE_TEXT: Record<Tone, string> = {
  muted: 'text-stone-500',
  danger: 'text-sentiment-negative',
};

export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
  tone = 'muted',
  size = 'pill',
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  tone?: Tone;
  size?: 'pill' | 'button';
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handlePress = () => {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    clearTimeout(timer.current);
    setArmed(false);
    onConfirm();
  };

  const padding = size === 'pill' ? 'px-3 py-2' : 'px-4 py-2.5';
  const textClass = size === 'pill' ? 'font-mono text-[11px] uppercase tracking-[0.7px]' : 'text-sm font-sans-medium';

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={`rounded-full border ${padding} active:opacity-75 ${
        armed ? 'border-sentiment-negative' : 'border-stone-900/10'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`${textClass} ${armed ? 'text-sentiment-negative' : TONE_TEXT[tone]}`}>{armed ? confirmLabel : label}</Text>
    </Pressable>
  );
}
