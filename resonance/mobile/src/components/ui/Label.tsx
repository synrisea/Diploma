import { Text, type TextProps } from './Text';
import { labelClass, sectionLabelClass } from './styles';

export function Label({ className, ...props }: TextProps) {
  return <Text {...props} className={`${labelClass} ${className ?? ''}`} />;
}

export function SectionLabel({ className, ...props }: TextProps) {
  return <Text {...props} className={`${sectionLabelClass} ${className ?? ''}`} />;
}
