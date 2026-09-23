import { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { colors, fonts } from '../../theme/tokens';
import { inputClass, inputFocusedClass } from './styles';

export interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { className, onFocus, onBlur, style, editable = true, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      ref={ref}
      {...props}
      editable={editable}
      placeholderTextColor={colors.stone[500]}
      keyboardAppearance="dark"
      selectionColor={colors.brand[500]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[{ fontFamily: fonts.sans }, style]}
      className={`${inputClass} ${focused ? inputFocusedClass : ''} ${editable ? '' : 'opacity-50'} ${className ?? ''}`}
    />
  );
});
