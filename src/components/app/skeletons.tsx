import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-1">
      <div className="hidden w-64 shrink-0 flex-col gap-3 border-r bg-sidebar p-4 md:flex">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-6 h-7 w-full" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-3/4" />
      </div>
      <div className="flex-1 space-y-6 p-6 md:p-10">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

