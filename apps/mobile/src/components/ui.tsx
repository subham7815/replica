import { ApiError, colors, radii, shadows, spacing } from '@newreplica/shared';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import type { z } from 'zod';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && { transform: [{ translateY: 1 }], opacity: 0.92 },
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading && <ActivityIndicator size="small" color={primary ? colors.white : colors.ink} />}
      <Text style={[styles.buttonText, { color: primary ? colors.white : colors.ink }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, error, hint, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.faint}
        accessibilityLabel={label}
        style={[styles.input, error ? { borderColor: colors.red } : null]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
  return (
    <View accessibilityRole="alert" style={styles.formError}>
      <Text style={{ color: colors.redDeep, fontSize: 14 }}>{message}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function fieldErrors<T>(schema: z.ZodType<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data, errors: null };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '_');
    errors[key] ??= issue.message;
  }
  return { data: null, errors };
}

export const text = StyleSheet.create({
  eyebrow: { color: colors.red, fontSize: 12, fontWeight: '600', letterSpacing: 2 },
  h1: { color: colors.ink, fontSize: 28, fontWeight: '700', lineHeight: 34 },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 14 },
  link: { color: colors.red, fontWeight: '600' },
});

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  buttonPrimary: { backgroundColor: colors.red, boxShadow: shadows.sm },
  buttonSecondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  buttonText: { fontWeight: '600', fontSize: 15 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '500' },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  error: { color: colors.red, fontSize: 13 },
  hint: { color: colors.muted, fontSize: 13 },
  formError: {
    backgroundColor: colors.redSoft,
    borderColor: '#c7102c33',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    boxShadow: shadows.sm,
  },
});
