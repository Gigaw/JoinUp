import { ActivitiesListScreen } from '../ui/activities-list-screen';

export function PlansScreen() {
  return (
    <ActivitiesListScreen
      archiveRoute="/plans/archive"
      emptyText="Когда вы присоединитесь к активности или вашу заявку одобрят, она появится здесь."
      emptyTitle="Планов пока нет"
      scope="plans"
      showPendingSummary
      subtitle="Куда вы идёте"
      testID="plans-screen"
      title="Планы"
    />
  );
}
