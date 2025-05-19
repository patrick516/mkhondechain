import React from "react";
import type { StatItem } from "@/types/dashboard";
import StatsCard from "./StatsCard";

interface StatsSectionProps {
  stats: StatItem[];
}

const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
};

export default StatsSection;
