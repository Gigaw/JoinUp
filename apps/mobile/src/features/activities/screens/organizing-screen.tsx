import { ActivitiesListScreen } from '../ui/activities-list-screen';

export function OrganizingScreen() {
  return (
    <ActivitiesListScreen
      archiveRoute="/organizing/archive"
      emptyText="Создайте первую активность и соберите людей для встречи."
      emptyTitle="Вы пока ничего не организуете"
      scope="organizing"
      showCreateAction
      subtitle="Какими встречами нужно управлять"
      testID="organizing-screen"
      title="Организую"
    />
  );
}
