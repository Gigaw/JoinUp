import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  loginSchema,
  type LoginValues,
} from '../../features/auth/login-schema';
import { AppError } from '../../shared/api/error';
import { useSession } from '../../shared/session/session-context';
import { colors, radius } from '../../shared/theme/tokens';

export default function SignInScreen() {
  const { login } = useSession();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await login(values);
      router.replace('/');
    } catch (error) {
      setError('root', {
        message:
          error instanceof AppError
            ? error.message
            : 'Не удалось выполнить вход.',
      });
    }
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      testID="sign-in-screen"
    >
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>в</Text>
        </View>
        <Text style={styles.brand}>вместе</Text>
      </View>
      <View style={styles.heading}>
        <Text style={styles.title}>С возвращением</Text>
        <Text style={styles.subtitle}>Найдём, чем заняться сегодня?</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              style={styles.input}
              testID="sign-in-email-input"
              value={value}
            />
          )}
        />
        {errors.email?.message ? (
          <Text style={styles.error}>{errors.email.message}</Text>
        ) : null}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Пароль</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              autoCapitalize="none"
              autoComplete="password"
              onBlur={onBlur}
              onChangeText={onChange}
              secureTextEntry
              style={styles.input}
              testID="sign-in-password-input"
              value={value}
            />
          )}
        />
        {errors.password?.message ? (
          <Text style={styles.error}>{errors.password.message}</Text>
        ) : null}
      </View>
      {errors.root?.message ? (
        <Text style={styles.error}>{errors.root.message}</Text>
      ) : null}
      <Pressable
        disabled={isSubmitting}
        onPress={() => void submit()}
        style={[styles.submit, isSubmitting && styles.submitDisabled]}
        testID="sign-in-submit"
      >
        <Text style={styles.submitText}>
          {isSubmitting ? 'Входим…' : 'Войти'}
        </Text>
      </Pressable>
      <Link href="/register" asChild>
        <Pressable testID="sign-in-register-link">
          <Text style={styles.link}>Нет аккаунта? Зарегистрироваться</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginBottom: 28,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 13,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  brandMarkText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  brand: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heading: { gap: 7, marginBottom: 10 },
  title: {
    color: colors.text,
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: { color: colors.textMuted, fontSize: 16 },
  field: { gap: 7 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.small,
    borderWidth: 1,
    color: colors.text,
    padding: 14,
  },
  error: { color: colors.danger },
  submit: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.small,
    marginTop: 8,
    padding: 16,
  },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  link: {
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    padding: 8,
  },
});
