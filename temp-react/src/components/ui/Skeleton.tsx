export function SkeletonCard() {
  return (
    <div className="p-4 bg-white rounded-xl border border-gray-100 animate-pulse space-y-2.5">
      <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
      <div className="h-3 bg-gray-100 rounded-lg w-full" />
      <div className="flex gap-2 mt-1">
        <div className="h-5 bg-gray-100 rounded-full w-16" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 bg-white rounded-xl border border-gray-100 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 bg-white rounded-xl border border-gray-100" />
        ))}
      </div>
    </div>
  );
}
