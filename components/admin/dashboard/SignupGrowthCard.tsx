/**
 * Cumulative user signup growth over the last 14 days (line + area chart).
 */

import { useColors } from '@/hooks/useColors';
import { ChartCard } from '@/components/admin/charts/ChartCard';
import { LineAreaChart } from '@/components/admin/charts/LineAreaChart';
import type { SeriesPoint } from '@/lib/utils/analytics';

type SignupGrowthCardProps = {
  data: SeriesPoint[];
};

export function SignupGrowthCard({ data }: SignupGrowthCardProps) {
  const colors = useColors();

  return (
    <ChartCard
      title="User Signup Growth"
      subtitle="Cumulative new users · last 14 days"
      height={220}
    >
      {(width) => (
        <LineAreaChart
          data={data}
          width={width}
          lineColor={colors.primary}
          fillColor={`${colors.primary}33`}
        />
      )}
    </ChartCard>
  );
}
