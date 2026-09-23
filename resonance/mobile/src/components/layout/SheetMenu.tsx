import { forwardRef, useCallback, type ReactNode } from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';

export const sheetBackgroundStyle = {
  backgroundColor: colors.panel,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  borderWidth: 1,
  borderColor: 'rgba(242, 235, 224, 0.1)',
} as const;

export const sheetHandleStyle = {
  backgroundColor: colors.stone[400],
  width: 36,
  height: 4,
} as const;

export function SheetBackdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} pressBehavior="close" />;
}

export const SheetMenu = forwardRef<BottomSheetModal, { children: ReactNode }>(function SheetMenu({ children }, ref) {
  const insets = useSafeAreaInsets();
  const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => <SheetBackdrop {...props} />, []);

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={sheetBackgroundStyle}
      handleIndicatorStyle={sheetHandleStyle}
      enablePanDownToClose
    >
      <BottomSheetView style={{ paddingBottom: insets.bottom }}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
});
