import { Ionicons } from '@expo/vector-icons';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { components } from '@vmeste/api-client';
import {
  useCancelEventMutation,
  useDecideEventApplicationMutation,
  useJoinEventMutation,
  useLeaveEventMutation,
} from '../../../features/events/event-mutations';
import {
  useEventApplications,
  useEventDetails,
} from '../../../features/events/event-queries';
import { formatEventTime } from '../../../features/events/event-details-utils';
import { EventImage } from '../../../features/events/ui/event-image';
import {
  colors,
  radius,
  spacing,
  touchTarget,
  typography,
} from '../../../shared/theme/tokens';

type EventDetails = components['schemas']['EventDetailsDto'];

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const query = useEventDetails(eventId);
  const join = useJoinEventMutation(eventId);
  const cancel = useCancelEventMutation(eventId);
  const leave = useLeaveEventMutation(eventId);
  const applications = useEventApplications(
    eventId,
    Boolean(query.data?.availableActions.includes('reviewApplications')),
  );
  const decideApplication = useDecideEventApplicationMutation(eventId);

  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data) {
    return (
      <ErrorState
        error={query.error?.message}
        retry={() => void query.refetch()}
      />
    );
  }

  const event = query.data;
  const canJoin =
    event.availableActions.includes('join') ||
    event.availableActions.includes('apply');
  const isOrganizer = event.availableActions.some((action) =>
    ['edit', 'cancel', 'reviewApplications'].includes(action),
  );
  const participation = event.myParticipation?.status;
  const mutationError =
    join.error?.message ??
    leave.error?.message ??
    cancel.error?.message ??
    decideApplication.error?.message;

  return (
    <View style={styles.screen} testID="event-details-screen">
      <Stack.Screen
        options={{
          headerShadowVisible: false,
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Назад"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons color={colors.primary} name="chevron-back" size={32} />
            </Pressable>
          ),
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          title: '',
          headerRight: () => (
            <Pressable
              accessibilityLabel="Поделиться активностью"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => void shareEvent(event)}
              style={styles.shareButton}
              testID="event-share"
            >
              <Ionicons color={colors.primary} name="share-outline" size={24} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroWrap}>
          <EventImage
            accessibilityLabel={`Обложка активности «${event.title}»`}
            categorySlug={event.category.slug}
            imageUrl={event.imageUrl}
            style={styles.hero}
          />
          <View style={styles.categoryPill}>
            <Text style={styles.category}>{event.category.name}</Text>
          </View>
        </View>
        {event.status === 'cancelled' ? (
          <View accessibilityRole="alert" style={styles.cancelledBanner}>
            <Ionicons
              color={colors.danger}
              name="alert-circle-outline"
              size={22}
            />
            <Text style={styles.cancelledText}>Активность отменена</Text>
          </View>
        ) : null}
        <View style={styles.heading}>
          <Text style={styles.title}>{event.title}</Text>
        </View>

        <View style={styles.eventInfoGroup}>
          <View style={styles.detailsCard}>
            <View style={styles.detailsTopRow}>
              <View style={[styles.detailItem, styles.cityDetailItem]}>
                <Ionicons
                  color={colors.primary}
                  name="location-outline"
                  size={24}
                />
                <Text style={[styles.detailValue, styles.cityValue]}>
                  {event.city.name}
                </Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={[styles.detailItem, styles.dateDetailItem]}>
                <Ionicons
                  color={colors.primary}
                  name="calendar-outline"
                  size={24}
                />
                <Text numberOfLines={1} style={styles.detailValue}>
                  {formatEventTime(event)}
                </Text>
              </View>
            </View>
            <View style={styles.horizontalDivider} />
            <View style={[styles.detailItem, styles.placeItem]}>
              <Ionicons
                color={colors.primary}
                name="navigate-outline"
                size={24}
              />
              <Text style={styles.detailValue}>{event.meetingPlace}</Text>
            </View>
          </View>

          <View style={styles.participationCard}>
            <View style={styles.infoRow}>
              <Ionicons
                color={colors.primary}
                name="people-outline"
                size={26}
              />
              <Text style={styles.infoTitle}>
                {event.participantsCount} из {event.capacity} участников
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.descriptionBlock}>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        <View style={styles.profilePanel}>
          <Text style={styles.panelTitle}>Организатор</Text>
          <Link
            href={{
              pathname: '/users/[userId]',
              params: { userId: event.organizer.id },
            }}
            asChild
          >
            <Pressable
              accessibilityHint="Открыть публичный профиль организатора"
              accessibilityLabel={`Организатор: ${event.organizer.displayName}`}
              accessibilityRole="button"
              style={styles.organizerRow}
              testID="event-organizer"
            >
              <Avatar name={event.organizer.displayName} />
              <View style={styles.organizerCopy}>
                <Text style={styles.organizerName}>
                  {event.organizer.displayName}
                </Text>
                <Text style={styles.organizerMeta}>
                  {event.city.name} · {event.category.name}
                </Text>
              </View>
              <Ionicons
                color={colors.textMuted}
                name="chevron-forward"
                size={22}
              />
            </Pressable>
          </Link>
        </View>

        <View style={styles.profilePanel}>
          <Text style={styles.panelTitle}>Участники</Text>
          {event.participants.length === 0 ? (
            <Text style={styles.emptyText}>
              Подтверждённых участников пока нет.
            </Text>
          ) : null}
          <Link
            href={{
              pathname: '/events/[eventId]/participants',
              params: { eventId: event.id },
            }}
            asChild
          >
            <Pressable
              accessibilityHint="Открыть полный список подтверждённых участников"
              accessibilityLabel={`Открыть список: ${event.participants.length} участников`}
              accessibilityRole="button"
              style={styles.participantsRow}
              testID="event-participants"
            >
              <View style={styles.avatarStack}>
                {event.participants.slice(0, 3).map((participant, index) => (
                  <View
                    key={participant.id}
                    style={index === 0 ? undefined : styles.stackedAvatar}
                  >
                    <Avatar name={participant.displayName} size="small" />
                  </View>
                ))}
              </View>
              <Text style={styles.participantsCount}>
                {participantCountLabel(event.participants.length)}
              </Text>
              <Ionicons
                color={colors.textMuted}
                name="chevron-forward"
                size={20}
              />
            </Pressable>
          </Link>
        </View>

        {event.availableActions.includes('reviewApplications') ? (
          <Applications
            applications={applications}
            decideApplication={decideApplication}
          />
        ) : null}
        {mutationError ? (
          <Text style={styles.error}>{mutationError}</Text>
        ) : null}
      </ScrollView>
      <EventFooter
        event={event}
        isOrganizer={isOrganizer}
        joinPending={join.isPending}
        leavePending={leave.isPending}
        cancelPending={cancel.isPending}
        onCancel={() =>
          Alert.alert(
            'Отменить активность?',
            'Она исчезнет из общего списка, а участники увидят статус отмены.',
            [
              { text: 'Не отменять', style: 'cancel' },
              {
                text: 'Отменить',
                style: 'destructive',
                onPress: () => cancel.mutate(),
              },
            ],
          )
        }
        onJoin={() => join.mutate()}
        onLeave={() => leave.mutate()}
        participation={participation}
        canJoin={canJoin}
      />
    </View>
  );
}

function Applications({
  applications,
  decideApplication,
}: {
  applications: ReturnType<typeof useEventApplications>;
  decideApplication: ReturnType<typeof useDecideEventApplicationMutation>;
}) {
  return (
    <Section title="Ожидающие заявки">
      {applications.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : null}
      {applications.error ? (
        <Text style={styles.error}>{applications.error.message}</Text>
      ) : null}
      {applications.data?.items.length === 0 ? (
        <Text style={styles.emptyText}>Новых заявок пока нет.</Text>
      ) : null}
      {applications.data?.items.map((application) => (
        <View key={application.id} style={styles.application}>
          <Text style={styles.applicationName}>
            {application.applicant.displayName}
          </Text>
          <View style={styles.applicationActions}>
            <Pressable
              accessibilityLabel={`Одобрить заявку ${application.applicant.displayName}`}
              disabled={decideApplication.isPending}
              onPress={() =>
                decideApplication.mutate({
                  participationId: application.id,
                  decision: 'approve',
                })
              }
              style={styles.smallPrimaryButton}
              testID={`application-approve-${application.id}`}
            >
              <Text style={styles.smallPrimaryButtonText}>Одобрить</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Отклонить заявку ${application.applicant.displayName}`}
              disabled={decideApplication.isPending}
              onPress={() =>
                decideApplication.mutate({
                  participationId: application.id,
                  decision: 'reject',
                })
              }
              style={styles.smallDangerButton}
              testID={`application-reject-${application.id}`}
            >
              <Text style={styles.smallDangerButtonText}>Отклонить</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </Section>
  );
}

function EventFooter({
  event,
  isOrganizer,
  canJoin,
  participation,
  joinPending,
  leavePending,
  cancelPending,
  onJoin,
  onLeave,
  onCancel,
}: {
  event: EventDetails;
  isOrganizer: boolean;
  canJoin: boolean;
  participation: string | undefined;
  joinPending: boolean;
  leavePending: boolean;
  cancelPending: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onCancel: () => void;
}) {
  if (event.status === 'cancelled') return null;
  if (isOrganizer) {
    return (
      <Footer>
        {event.availableActions.includes('edit') ? (
          <Link
            href={{ pathname: '/events/edit', params: { eventId: event.id } }}
            asChild
          >
            <Pressable
              accessibilityRole="button"
              style={styles.primaryButton}
              testID="event-edit"
            >
              <Text style={styles.primaryButtonText}>Редактировать</Text>
            </Pressable>
          </Link>
        ) : null}
        {event.availableActions.includes('cancel') ? (
          <Pressable
            accessibilityRole="button"
            disabled={cancelPending}
            onPress={onCancel}
            style={styles.dangerButton}
            testID="event-cancel"
          >
            <Text style={styles.dangerButtonText}>
              {cancelPending ? 'Отменяем…' : 'Отменить активность'}
            </Text>
          </Pressable>
        ) : null}
      </Footer>
    );
  }
  if (participation === 'going') {
    return (
      <Footer>
        <Link
          href={{ pathname: '/chats/[eventId]', params: { eventId: event.id } }}
          asChild
        >
          <Pressable
            accessibilityRole="button"
            style={styles.primaryButton}
            testID="event-chat"
          >
            <Text style={styles.primaryButtonText}>Открыть чат</Text>
          </Pressable>
        </Link>
        <Pressable
          accessibilityRole="button"
          disabled={leavePending}
          onPress={onLeave}
          style={styles.secondaryButton}
          testID="event-leave"
        >
          <Text style={styles.secondaryButtonText}>
            {leavePending ? 'Сохраняем…' : 'Отказаться от участия'}
          </Text>
        </Pressable>
      </Footer>
    );
  }
  if (participation === 'pending') {
    return (
      <Footer>
        <Text accessibilityLiveRegion="polite" style={styles.pendingStatus}>
          Заявка отправлена
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={leavePending}
          onPress={onLeave}
          style={styles.secondaryButton}
          testID="event-leave"
        >
          <Text style={styles.secondaryButtonText}>
            {leavePending ? 'Сохраняем…' : 'Отозвать заявку'}
          </Text>
        </Pressable>
      </Footer>
    );
  }
  if (canJoin) {
    return (
      <Footer>
        <Pressable
          accessibilityRole="button"
          disabled={joinPending}
          onPress={onJoin}
          style={styles.primaryButton}
          testID="event-participation-submit"
        >
          <Text style={styles.primaryButtonText}>
            {joinPending
              ? 'Отправляем…'
              : event.participationMode === 'automatic'
                ? 'Присоединиться'
                : 'Подать заявку'}
          </Text>
        </Pressable>
      </Footer>
    );
  }
  if (event.isFull && !participation) {
    return (
      <Footer>
        <View accessibilityRole="button" style={styles.disabledButton}>
          <Text style={styles.disabledButtonText}>Мест нет</Text>
        </View>
      </Footer>
    );
  }
  return participation ? (
    <Footer>
      <Text accessibilityLiveRegion="polite" style={styles.pendingStatus}>
        {participationLabel(participation)}
      </Text>
    </Footer>
  ) : null;
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.footerShell}>
      <View style={styles.footer}>{children}</View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Avatar({
  name,
  size = 'regular',
}: {
  name: string;
  size?: 'regular' | 'small';
}) {
  return (
    <View
      accessible={false}
      style={[styles.avatar, size === 'small' && styles.smallAvatar]}
    >
      <Text
        style={[styles.avatarText, size === 'small' && styles.smallAvatarText]}
      >
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.state} testID="event-details-loading">
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.stateText}>Загружаем активность…</Text>
    </View>
  );
}

function ErrorState({ error, retry }: { error?: string; retry: () => void }) {
  return (
    <View style={styles.state} testID="event-details-error">
      <Ionicons color={colors.danger} name="alert-circle-outline" size={36} />
      <Text style={styles.error}>
        {error ?? 'Не удалось загрузить активность.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonText}>Повторить</Text>
      </Pressable>
    </View>
  );
}

function participationLabel(status: string): string {
  const labels: Record<string, string> = {
    rejected: 'Заявка отклонена',
    withdrawn: 'Заявка отозвана',
    cancelled: 'Вы отказались от участия',
  };
  return labels[status] ?? 'Статус участия обновлён';
}

function participantCountLabel(count: number): string {
  if (count === 1) return '1 участник';
  return `${count} участников`;
}

async function shareEvent(event: EventDetails) {
  await Share.share({
    message: `${event.title}\nvmeste://events/${event.id}`,
    title: event.title,
  });
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing.xl, padding: spacing.xl, paddingBottom: 144 },
  hero: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.large,
    height: 228,
    width: '100%',
  },
  heroWrap: { position: 'relative' },
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget,
    minWidth: touchTarget,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget,
    minWidth: touchTarget,
  },
  heading: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    left: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
    top: spacing.lg,
  },
  category: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  title: { color: colors.text, ...typography.screenTitle },
  cancelledBanner: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.medium,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  cancelledText: { color: colors.danger, fontWeight: '800' },
  detailsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    overflow: 'hidden',
  },
  eventInfoGroup: { gap: spacing.sm },
  detailsTopRow: { flexDirection: 'row', padding: spacing.md },
  detailItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateDetailItem: { flexGrow: 1, flexShrink: 1 },
  cityDetailItem: { flexShrink: 0 },
  placeItem: { padding: spacing.md },
  detailValue: { color: colors.text, flex: 1, fontSize: 16, lineHeight: 22 },
  cityValue: { flex: 0, flexShrink: 0 },
  verticalDivider: {
    backgroundColor: colors.border,
    height: 32,
    marginHorizontal: spacing.sm,
    width: 1,
  },
  horizontalDivider: { backgroundColor: colors.border, height: 1 },
  participationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  infoRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  infoTitle: { color: colors.text, fontSize: 17, fontWeight: '400' },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.text, ...typography.sectionTitle },
  sectionDescription: { color: colors.textMuted, lineHeight: 20 },
  descriptionBlock: { paddingHorizontal: spacing.xs },
  description: { color: colors.text, fontSize: 17, lineHeight: 25 },
  profilePanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  panelTitle: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  organizerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: { color: colors.surface, fontSize: 20, fontWeight: '800' },
  smallAvatar: {
    borderColor: colors.surface,
    borderWidth: 2,
    height: 40,
    width: 40,
  },
  smallAvatarText: { fontSize: 15 },
  organizerCopy: { flex: 1, gap: spacing.xs },
  organizerName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  organizerMeta: { color: colors.textMuted, fontSize: 14 },
  participantsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: touchTarget,
  },
  avatarStack: { flexDirection: 'row', marginRight: spacing.sm },
  stackedAvatar: { marginLeft: -spacing.md },
  participantsCount: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: { color: colors.textMuted, lineHeight: 20 },
  application: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  applicationName: { color: colors.text, fontWeight: '800' },
  applicationActions: { flexDirection: 'row', gap: spacing.sm },
  smallPrimaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  smallPrimaryButtonText: { color: colors.surface, fontWeight: '800' },
  smallDangerButton: {
    borderColor: colors.danger,
    borderRadius: radius.small,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  smallDangerButtonText: { color: colors.danger, fontWeight: '800' },
  footerShell: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopLeftRadius: radius.medium,
    borderTopRightRadius: radius.medium,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  footer: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.small,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: radius.small,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: { color: colors.primary, fontWeight: '800' },
  dangerButton: {
    alignItems: 'center',
    borderColor: colors.danger,
    borderRadius: radius.small,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dangerButtonText: { color: colors.danger, fontWeight: '800' },
  disabledButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.small,
    justifyContent: 'center',
    minHeight: touchTarget,
    padding: spacing.md,
  },
  disabledButtonText: { color: colors.textMuted, fontWeight: '800' },
  pendingStatus: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  state: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateText: { color: colors.textMuted },
  error: { color: colors.danger, lineHeight: 20, textAlign: 'center' },
});
