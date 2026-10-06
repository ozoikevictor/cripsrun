export default function AdminLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="mt-4 h-9 w-72 max-w-full rounded bg-muted" />
        <div className="mt-3 h-4 w-[32rem] max-w-full rounded bg-muted" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-card p-4">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="mt-5 h-8 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-80 rounded-xl border bg-card lg:col-span-2" />
        <div className="h-80 rounded-xl border bg-card" />
      </div>
    </div>
  );
}
