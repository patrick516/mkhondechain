import { useEffect, useState } from "react";
import { fetchCycleStatus } from "@/api/cycle";
import { useAuth } from "@/context/AuthContext";

export default function CycleCountdownBanner() {
  const { admin } = useAuth();
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  useEffect(() => {
    // Superadmin has no group/cycle — nothing to show
    if (admin?.role === "superadmin") return;

    fetchCycleStatus()
      .then((status) => {
        if (status.cycleActive) {
          setDaysRemaining(status.daysRemaining);
          setEndDate(status.cycleEndDate);
        }
      })
      .catch(() => {
        // Silent — a banner failing to load shouldn't disrupt the page
      });
  }, [admin]);

  // Only show in the final stretch before cycle close
  if (daysRemaining === null || daysRemaining > 4 || daysRemaining < 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between">
      <p className="text-sm text-amber-800">
        <span className="font-semibold">Cycle ending soon</span> —{" "}
        {daysRemaining === 0
          ? "ends today"
          : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}
        {endDate && ` (${new Date(endDate).toLocaleDateString()})`}. Review
        member records before share-out.
      </p>
    </div>
  );
}
