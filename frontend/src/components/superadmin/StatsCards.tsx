import type { SystemStats } from "@/api/groups";

interface StatsCardsProps {
  stats: SystemStats | null;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) return null;

  const cards = [
    { label: "Groups", value: `${stats.activeGroups} / ${stats.totalGroups}` },
    { label: "Total Members", value: stats.totalMembers.toLocaleString() },
    {
      label: "System Savings",
      value: `MK ${stats.totalSystemSavings.toLocaleString()}`,
    },
    {
      label: "Outstanding Loans",
      value: `MK ${stats.totalOutstandingLoans.toLocaleString()}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((s) => (
        <div key={s.label} className="bg-white rounded-2xl shadow p-5">
          <p className="text-xs text-gray-500">{s.label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
