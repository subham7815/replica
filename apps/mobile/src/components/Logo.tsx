import { colors, spacing } from '@newreplica/shared';
import { StyleSheet, Text, View } from 'react-native';

export function Logo() {
  return (
    <View style={styles.row}>
      <View style={styles.mark}>
        <Text style={styles.markText}>R</Text>
      </View>
      <Text style={styles.name}>Replica</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mark: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  markText: { color: colors.white, fontWeight: '700' },
  name: { color: colors.ink, fontWeight: '600', fontSize: 16 },
});
