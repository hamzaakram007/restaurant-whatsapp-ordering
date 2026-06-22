import { Suspense } from "react";
import { CounterDashboard } from "@/components/CounterDashboard";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <CounterDashboard />
    </Suspense>
  );
}
