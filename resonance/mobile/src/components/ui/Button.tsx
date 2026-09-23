import { Pressable, type PressableProps } from 'react-native';
import { Text } from './Text';
import { pillTextClass } from './styles';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  className?: string;
  textClassName?: string;
}

export function PrimaryButton({ label, className, textClassName, disabled, ...props }: ButtonProps) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      className={`rounded-full bg-brand-500 px-4 py-2 active:bg-brand-600 ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}
    >
      <Text className={`text-center text-sm font-sans-medium text-brand-ink ${textClassName ?? ''}`}>{label}</Text>
    </Pressable>
  );
}

type LinkTone = 'brand' | 'muted' | 'danger';

const LINK_TONE_CLASS: Record<LinkTone, string> = {
  brand: 'text-brand-600',
  muted: 'text-stone-500',
  danger: 'text-sentiment-negative',
};

export function LinkButton({
  label,
  tone = 'brand',
  className,
  textClassName,
  disabled,
  ...props
}: ButtonProps & { tone?: LinkTone }) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      className={`active:opacity-75 ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}
    >
      <Text className={`text-sm font-sans-medium ${LINK_TONE_CLASS[tone]} ${textClassName ?? ''}`}>{label}</Text>
    </Pressable>
  );
}

type PillTone = 'default' | 'primary' | 'danger' | 'active';

const PILL_CLASS: Record<PillTone, { box: string; text: string }> = {
  default: { box: 'border border-stone-900/10', text: 'text-stone-500' },
  active: { box: 'border border-stone-900/10 bg-stone-900/10', text: 'text-stone-900' },
  primary: { box: 'border border-brand-500 bg-brand-500 active:bg-brand-600', text: 'text-brand-ink' },
  danger: { box: 'border border-stone-900/10', text: 'text-sentiment-negative' },
};

export function PillButton({
  label,
  tone = 'default',
  className,
  textClassName,
  disabled,
  ...props
}: ButtonProps & { tone?: PillTone }) {
  const style = PILL_CLASS[tone];
  return (
    <Pressable
      {...props}
      disabled={disabled}
      className={`rounded-full px-3 py-1.5 active:opacity-75 ${style.box} ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}
    >
      <Text className={`${pillTextClass} ${style.text} ${textClassName ?? ''}`}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ className, disabled, children, ...props }: PressableProps & { className?: string }) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      className={`h-8 w-8 items-center justify-center rounded-full border border-stone-900/10 active:opacity-75 ${
        disabled ? 'opacity-50' : ''
      } ${className ?? ''}`}
    >
      {children}
    </Pressable>
  );
}
