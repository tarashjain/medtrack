export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="skeleton h-5 w-48 rounded mb-2" />
      <div className="skeleton h-4 w-36 rounded mb-3" />
      <div className="skeleton h-3 w-full rounded mb-2" />
      <div className="skeleton h-3 w-2/3 rounded mb-4" />
      <div className="flex gap-2">
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="skeleton h-7 w-64 rounded mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton h-3 w-16 rounded mb-2" />
              <div className="skeleton h-5 w-32 rounded" />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="skeleton h-3 w-12 rounded mb-2" />
          <div className="skeleton h-16 w-full rounded" />
        </div>
      </div>
    </div>
  );
}
