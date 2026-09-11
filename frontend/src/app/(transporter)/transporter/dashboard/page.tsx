"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TransporterDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/distributor/dashboard");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-black/50 dark:text-white/50">
        Redirecting to Distributor Dashboard…
      </p>
    </div>
  );
}