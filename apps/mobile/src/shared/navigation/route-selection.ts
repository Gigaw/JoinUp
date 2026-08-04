export type RootDestination =
  'loading' | 'sign-in' | 'onboarding' | 'events' | 'error';

export function selectRootDestination(input: {
  restoring: boolean;
  hasToken: boolean;
  meLoading: boolean;
  meError: boolean;
  onboardingCompleted?: boolean;
}): RootDestination {
  if (input.restoring) return 'loading';
  if (!input.hasToken) return 'sign-in';
  if (input.meLoading) return 'loading';
  if (input.meError) return 'error';
  return input.onboardingCompleted ? 'events' : 'onboarding';
}
