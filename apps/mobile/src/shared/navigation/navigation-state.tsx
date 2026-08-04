import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function NavigationLoading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  );
}

export function NavigationError({ retry }: { retry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.error}>Не удалось загрузить профиль.</Text>
      <Button title="Повторить" onPress={retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  error: { color: '#b42318' },
});
