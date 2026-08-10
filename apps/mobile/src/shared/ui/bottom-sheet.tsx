import BottomSheet, { BottomSheetView } from '@expo/ui/community/bottom-sheet';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';

type AppBottomSheetProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: (string | number)[];
  testID?: string;
};

export function AppBottomSheet({
  children,
  isOpen,
  onClose,
  snapPoints,
  testID,
}: AppBottomSheetProps) {
  return (
    <BottomSheet
      backgroundStyle={styles.background}
      enableDynamicSizing={!snapPoints}
      enablePanDownToClose
      index={isOpen ? 0 : -1}
      onClose={onClose}
      snapPoints={snapPoints}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.inner} testID={testID}>
          {children}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: colors.surface },
  content: { paddingBottom: spacing.xxxl },
  inner: { paddingHorizontal: spacing.xl },
});
