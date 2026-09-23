import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Text } from './Text';
import { inputClass } from './styles';
import { colors } from '../../theme/tokens';
import { dateFromIso, formatVisitDate, isoFromDate } from '../../lib/formatVisitDate';

interface DateFieldProps {
  value: string;
  minimum?: string;
  onChange: (iso: string) => void;
}

export function DateField({ value, minimum, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const date = dateFromIso(value);
  const minimumDate = minimum ? dateFromIso(minimum) : undefined;

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && selected) onChange(isoFromDate(selected));
  };

  if (Platform.OS === 'ios') {
    return (
      <View className={`${inputClass} flex-row items-center justify-between`}>
        <Text className="text-sm text-stone-900">{formatVisitDate(value)}</Text>
        <DateTimePicker
          value={date}
          mode="date"
          display="compact"
          minimumDate={minimumDate}
          onChange={handleChange}
          themeVariant="dark"
          accentColor={colors.brand[500]}
        />
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Pick a date"
        className={`${inputClass} flex-row items-center justify-between active:border-brand-500`}
      >
        <Text className="text-sm text-stone-900">{formatVisitDate(value)}</Text>
        <Text className="font-mono text-[11px] text-stone-500">{value}</Text>
      </Pressable>
      {open && (
        <DateTimePicker value={date} mode="date" display="default" minimumDate={minimumDate} onChange={handleChange} />
      )}
    </>
  );
}
