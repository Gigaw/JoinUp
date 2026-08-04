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
import { z } from 'zod';
import { AppError } from '../../shared/api/error';
import { useSession } from '../../shared/session/session-context';

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
      <Text style={styles.title}>Найдите компанию рядом</Text>
      <Text style={styles.subtitle}>
        Создайте аккаунт, чтобы увидеть активности.
      </Text>
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
      <Button
        title={isSubmitting ? 'Создаём…' : 'Зарегистрироваться'}
        onPress={() => void submit()}
        disabled={isSubmitting}
        testID="register-submit"
      />
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
      <Text>{label}</Text>
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
