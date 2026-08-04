import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  Button,
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
      <Text style={styles.title}>С возвращением</Text>
      <Text style={styles.subtitle}>Войдите, чтобы продолжить.</Text>
      <View style={styles.field}>
        <Text>Email</Text>
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
        <Text>Пароль</Text>
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
      <Button
        title={isSubmitting ? 'Входим…' : 'Войти'}
        disabled={isSubmitting}
        onPress={() => void submit()}
        testID="sign-in-submit"
      />
      <Link href="/register" asChild>
        <Pressable testID="sign-in-register-link">
          <Text style={styles.link}>Нет аккаунта? Зарегистрироваться</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#5c6470', marginBottom: 10 },
  field: { gap: 6 },
  input: {
    borderColor: '#aeb5bf',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  error: { color: '#b42318' },
  link: { color: '#2457d6', textAlign: 'center', padding: 8 },
});
