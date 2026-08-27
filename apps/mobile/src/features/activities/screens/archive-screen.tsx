import { ActivitiesListScreen } from '../ui/activities-list-screen';

export function ArchiveScreen() {
  return (
    <ActivitiesListScreen
      archiveRoute="/plans/archive"
      emptyText="Здесь появятся прошедшие, отменённые и завершённые активности, к которым вы подключались."
      emptyTitle="Архив пока пуст"
      scope="archive"
      showArchiveAction={false}
      showBackAction
      subtitle="Архив активностей, к которым вы подключались"
      testID="plans-archive-screen"
      title="Архив"
    />
  );
}

export function OrganizerArchiveScreen() {
  return (
    <ActivitiesListScreen
      archiveRoute="/organizing/archive"
      emptyText="Прошедшие и отменённые созданные активности появятся здесь."
      emptyTitle="Архив организатора пуст"
      scope="organizing_archive"
      showArchiveAction={false}
      showBackAction
      subtitle="Прошедшие и отменённые созданные активности"
      testID="organizing-archive-screen"
      title="Архив организатора"
    />
  );
}
