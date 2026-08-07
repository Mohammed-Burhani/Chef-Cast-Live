/**
 * Episode status distribution — donut (live / scheduled / ended).
 */

import { useColors } from '@/hooks/useColors';
import { ChartCard } from '@/components/admin/charts/ChartCard';
import { DonutChart } from '@/components/admin/charts/DonutChart';
import type { EpisodeStatusCounts } from '@/lib/utils/analytics';

type EpisodeStatusCardProps = {
  status: EpisodeStatusCounts;
};

export function EpisodeStatusCard({ status }: EpisodeStatusCardProps) {
  const colors = useColors();
  const total = status.scheduled + status.live + status.ended;

  return (
    <ChartCard title="Episode Status" subtitle={`${total} episodes total`} height={240}>
      {() => (
        <DonutChart
          segments={[
            { label: 'Scheduled', value: status.scheduled, color: colors.primary },
            { label: 'Live Now', value: status.live, color: colors.live },
            { label: 'Ended', value: status.ended, color: colors.accent },
          ]}
          centerValue={total}
          centerLabel="Episodes"
        />
      )}
    </ChartCard>
  );
}
