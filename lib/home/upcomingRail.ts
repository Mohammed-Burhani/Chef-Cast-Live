/**
 * "Going Live Soon" rail computation for the home screen.
 *
 * The rail shows two kinds of episodes:
 *  - reminders — scheduled episodes within the next hour that are NOT live yet;
 *  - live episodes that we watched transition from a reminder during this
 *    session (`transitionedLiveIds`), so their card stays visible and visibly
 *    becomes "Join the quiz" the moment the episode goes live, instead of
 *    vanishing on the next refetch.
 *
 * Episodes that are already live when the home screen mounts (never seen as a
 * reminder) are deliberately excluded — the ON AIR banner covers those, and the
 * rail shouldn't accumulate stale live cards.
 *
 * Kept as a pure function so the transform logic is unit-testable.
 */

export type RailEpisode = { id: string; is_live: boolean };

export function buildUpcomingRail<T extends RailEpisode>(
  soonLive: T[] | undefined,
  transitionedLiveIds: ReadonlySet<string>
): T[] {
  if (!soonLive) return [];

  // Only show episodes that are NOT live yet
  const reminders = soonLive.filter((ep) => !ep.is_live);
  
  // Show live episodes ONLY if we watched them transition during this session
  const liveTransitioned = soonLive.filter(
    (ep) => ep.is_live && transitionedLiveIds.has(ep.id)
  );

  return [...reminders, ...liveTransitioned];
}
