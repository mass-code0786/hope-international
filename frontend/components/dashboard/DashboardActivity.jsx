import { Badge } from '@/components/ui/Badge';
import { currency, dateTime, orderStatusLabel, statusVariant } from '@/lib/utils/format';

export function DashboardActivity({ income = [], orders = [], joins = [], support = [] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ActivityCard title="Recent income" items={income} emptyTitle="No income entries yet" emptyDescription="Recent direct, matching, and reward credits will appear here." renderItem={(item) => (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text">{item.title}</p>
            <p className="mt-1 text-xs text-muted">{item.subtitle}</p>
          </div>
          <p className="text-sm font-semibold text-emerald-600">{item.value}</p>
        </div>
      )} />

      <ActivityCard title="Recent orders" items={orders} emptyTitle="No orders yet" emptyDescription="Order activity will appear here after purchases are placed." renderItem={(item) => (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text">{item.title}</p>
            <p className="mt-1 text-xs text-muted">{item.subtitle}</p>
          </div>
          <Badge variant={statusVariant(item.status)}>{orderStatusLabel(item.status)}</Badge>
        </div>
      )} />

      <ActivityCard title="Recent team joins" items={joins} emptyTitle="No team joins yet" emptyDescription="Direct members will appear here when new referrals are placed under you." renderItem={(item) => (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text">{item.title}</p>
            <p className="mt-1 text-xs text-muted">{item.subtitle}</p>
          </div>
          <Badge variant={item.active ? 'success' : 'warning'}>{item.active ? 'Active' : 'Inactive'}</Badge>
        </div>
      )} />

      <ActivityCard title="Support activity" items={support} emptyTitle="No support activity" emptyDescription="Open and replied support threads will show here." renderItem={(item) => (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text">{item.title}</p>
            <p className="mt-1 text-xs text-muted">{item.subtitle}</p>
          </div>
          <Badge variant={item.variant}>{item.badge}</Badge>
        </div>
      )} />
    </div>
  );
}

function ActivityCard({ title, items, emptyTitle, emptyDescription, renderItem }) {
  return (
    <section className="card-surface p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-[-0.04em] text-text">{title}</h2>
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-[22px] border border-[var(--hope-border)] bg-cardSoft p-3.5">
              {renderItem(item)}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-[var(--hope-border)] bg-cardSoft px-4 py-8 text-center">
          <p className="text-sm font-semibold text-text">{emptyTitle}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{emptyDescription}</p>
        </div>
      )}
    </section>
  );
}
