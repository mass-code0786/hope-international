import { StatCard } from '@/components/ui/StatCard';

export function MetricCard(props) {
  return <StatCard {...props} emphasis={props.emphasis || 'primary'} />;
}
