import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { fetchGroupAnalytics } from "@/api/groups";
import type { GroupAnalytics as GroupAnalyticsData } from "@/api/groups";
import toast from "react-hot-toast";

const COLORS = [
  "#1F3864",
  "#2E5C99",
  "#5B9BD5",
  "#8FAADC",
  "#B4C7E7",
  "#D9E2F3",
];

export default function GroupAnalytics() {
  const [data, setData] = useState<GroupAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroupAnalytics()
      .then(setData)
      .catch(() => toast.error("Failed to load group analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 text-sm text-gray-400">
        Loading analytics…
      </div>
    );
  }

  if (!data || data.groups.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 text-sm text-gray-400">
        No group data yet.
      </div>
    );
  }

  const { groups, trend } = data;
  const leaderboard = groups.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doughnut — savings share per group */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Savings Share by Group
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={groups}
                dataKey="totalSaved"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {groups.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `MK ${v.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar — group comparison */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Total Saved by Group
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={groups}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `MK ${v.toLocaleString()}`} />
              <Bar dataKey="totalSaved" fill="#2E5C99" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend line — system-wide savings, last 30 days */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          System Savings Trend (Last 30 Days)
        </h3>
        {trend.length === 0 ? (
          <p className="text-sm text-gray-400">
            No savings activity in the last 30 days.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `MK ${v.toLocaleString()}`} />
              <Line
                type="monotone"
                dataKey="totalSaved"
                stroke="#1F3864"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Top Saving Groups
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left px-6 py-2">Rank</th>
              <th className="text-left px-6 py-2">Group</th>
              <th className="text-left px-6 py-2">Location</th>
              <th className="text-right px-6 py-2">Total Saved</th>
              <th className="text-right px-6 py-2">Members</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((g, i) => (
              <tr key={g.id} className="border-t border-gray-100">
                <td className="px-6 py-2 font-semibold text-gray-800">
                  #{i + 1}
                </td>
                <td className="px-6 py-2">{g.name}</td>
                <td className="px-6 py-2 text-gray-500">{g.location}</td>
                <td className="px-6 py-2 text-right font-medium">
                  MK {g.totalSaved.toLocaleString()}
                </td>
                <td className="px-6 py-2 text-right text-gray-500">
                  {g.memberCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
