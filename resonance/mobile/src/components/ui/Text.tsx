import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { twMerge } from 'tailwind-merge';

export interface TextProps extends RNTextProps {
  className?: string;
}

export function Text({ className, ...props }: TextProps) {
  return <RNText {...props} className={twMerge('font-sans text-stone-900', className)} />;
}
