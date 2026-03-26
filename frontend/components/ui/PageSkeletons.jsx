import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

function CardRow({ count = 4, className = 'h-32' }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <LoadingSkeleton key={idx} className={className} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <LoadingSkeleton className="h-10 w-72" />
      <CardRow count={4} className="h-36" />
      <CardRow count={2} className="h-44" />
      <LoadingSkeleton className="h-28" />
      <CardRow count={2} className="h-72" />
    </div>
  );
}

export function ShopSkeleton() {
  return (
    <div className="space-y-5">
      <LoadingSkeleton className="h-10 w-64" />
      <LoadingSkeleton className="h-12" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <LoadingSkeleton key={idx} className="h-80" />
        ))}
      </div>
    </div>
  );
}

export function TeamSkeleton() {
  return (
    <div className="space-y-5">
      <LoadingSkeleton className="h-10 w-64" />
      <CardRow count={4} className="h-28" />
      <LoadingSkeleton className="h-10 w-44" />
      <LoadingSkeleton className="h-96" />
    </div>
  );
}

export function IncomeSkeleton() {
  return (
    <div className="space-y-5">
      <LoadingSkeleton className="h-10 w-64" />
      <CardRow count={4} className="h-28" />
      <LoadingSkeleton className="h-10 w-80" />
      <LoadingSkeleton className="h-96" />
    </div>
  );
}

export function OrdersSkeleton() {
  return (
    <div className="space-y-5">
      <LoadingSkeleton className="h-10 w-56" />
      <LoadingSkeleton className="h-96" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <LoadingSkeleton className="h-10 w-56" />
      <CardRow count={2} className="h-36" />
      <LoadingSkeleton className="h-48" />
      <CardRow count={4} className="h-20" />
    </div>
  );
}

export function SellerDashboardSkeleton() {
  return (
    <div className="space-y-5">
      <LoadingSkeleton className="h-10 w-72" />
      <CardRow count={5} className="h-32" />
      <LoadingSkeleton className="h-64" />
      <LoadingSkeleton className="h-40" />
    </div>
  );
}

export function SellerProductsSkeleton() {
  return (
    <div className="space-y-5">
      <LoadingSkeleton className="h-10 w-64" />
      <LoadingSkeleton className="h-12" />
      <LoadingSkeleton className="h-96" />
    </div>
  );
}

export function SellerApplySkeleton() {
  return (
    <div className="space-y-5">
      <LoadingSkeleton className="h-10 w-64" />
      <LoadingSkeleton className="h-24" />
      <LoadingSkeleton className="h-[520px]" />
    </div>
  );
}
