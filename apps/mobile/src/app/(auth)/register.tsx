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
import { z } from 'zod';
import { AppError } from '../../shared/api/error';
import { useSession } from '../../shared/session/session-context';
import { colors, radius } from '../../shared/theme/tokens';

const schema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов').max(128),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: ГГГГ-ММ-ДД'),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { register } = useSession();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', birthDate: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await register(values);
      router.replace('/');
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : 'Не удалось зарегистрироваться.';
      setError('root', { message });
    }
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      testID="register-screen"
    >
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>в</Text>
        </View>
        <Text style={styles.brand}>вместе</Text>
      </View>
      <View style={styles.heading}>
        <Text style={styles.title}>Найдите своих</Text>
        <Text style={styles.subtitle}>
          Создайте аккаунт — и планы на вечер появятся сами.
        </Text>
      </View>
      <Field
        control={control}
        name="email"
        label="Email"
        error={errors.email?.message}
      />
      <Field
        control={control}
        name="password"
        label="Пароль"
        secureTextEntry
        error={errors.password?.message}
      />
      <Field
        control={control}
        name="birthDate"
        label="Дата рождения (ГГГГ-ММ-ДД)"
        error={errors.birthDate?.message}
      />
      {errors.root?.message ? (
        <Text style={styles.error}>{errors.root.message}</Text>
      ) : null}
      <Pressable
        disabled={isSubmitting}
        onPress={() => void submit()}
        style={[styles.submit, isSubmitting && styles.submitDisabled]}
        testID="register-submit"
      >
        <Text style={styles.submitText}>
          {isSubmitting ? 'Создаём…' : 'Создать аккаунт'}
        </Text>
      </Pressable>
      <Link href="/sign-in" asChild>
        <Pressable testID="register-sign-in-link">
          <Text style={styles.link}>Уже есть аккаунт? Войти</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}

function Field({
  control,
  name,
  label,
  error,
  secureTextEntry = false,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control'];
  name: keyof FormValues;
  label: string;
  error?: string;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onBlur, onChange, value } }) => (
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onBlur={onBlur}
            onChangeText={onChange}
            secureTextEntry={secureTextEntry}
            style={styles.input}
            testID={`register-${name}-input`}
            value={value}
          />
        )}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 15,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginBottom: 18,
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
  heading: { gap: 7, marginBottom: 8 },
  title: {
    color: colors.text,
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 22 },
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
    marginTop: 6,
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
