/**
 * Quiz engagement over the last 14 days — answers per day (bar chart).
 * Today's bar is highlighted.
 */

import { useColors } from '@/hooks/useColors';
import { ChartCard } from '@/components/admin/charts/ChartCard';
import { BarChart } from '@/components/admin/charts/BarChart';
import type { SeriesPoint } from '@/lib/utils/analytics';

type AnswersPerDayCardProps = {
  data: SeriesPoint[];
};

export function AnswersPerDayCard({ data }: AnswersPerDayCardProps) {
  const colors = useColors();

  return (
    <ChartCard
      title="Engagement"
      subtitle="Answers per day · last 14 days"
      height={200}
    >
      {(width) => (
        <BarChart
          data={data}
          width={width}
          color={colors.accent}
          highlightLast
          highlightColor={colors.warning}
        />
      )}
    </ChartCard>
  );
}
