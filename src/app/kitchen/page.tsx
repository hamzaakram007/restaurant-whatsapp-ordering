import { Suspense } from "react";
import { KitchenDisplay } from "@/components/KitchenDisplay";

export default function KitchenPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <KitchenDisplay />
    </Suspense>
  );
}
