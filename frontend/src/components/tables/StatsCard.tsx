import React from "react";
import type { StatItem } from "@/types/dashboard";

const StatsCard: React.FC<StatItem> = ({
  label,
  value,
  bg = "bg-primary",
  icon,
}) => {
  return (
    <div className={`rounded-lg shadow-md p-4 text-white ${bg}`}>
      <div className="mb-1 text-sm opacity-80">{label}</div>
      <div className="text-xl font-bold">{value}</div>
      {icon && <div className="mt-2">{icon}</div>}
    </div>
  );
};

export default StatsCard;
