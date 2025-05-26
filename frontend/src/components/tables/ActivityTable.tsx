import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { ActivityItem } from "@/types/dashboard";

interface Props {
  data: ActivityItem[];
}

const socket = io("http://localhost:4000"); // Change this for production

export default function ActivityTable({ data }: Props) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  // Load initial data from parent
  useEffect(() => {
    setActivity(data);
  }, [data]);

  // Real-time socket updates
  useEffect(() => {
    socket.on("transaction:new", (newEntry: ActivityItem) => {
      setActivity((prev) => [newEntry, ...prev.slice(0, 9)]);
    });

    return () => {
      socket.off("transaction:new");
    };
  }, []);

  return (
    <div className="mt-6 overflow-x-auto bg-white rounded shadow">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left bg-gray-100">
            <th className="px-4 py-2">Member</th>
            <th className="px-4 py-2">Action</th>
            <th className="px-4 py-2">Amount</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {activity.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                No recent activity found.
              </td>
            </tr>
          ) : (
            activity.map((entry, i) => {
              const formattedDate = entry.date
                ? new Date(entry.date).toLocaleString("en-MW", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "N/A";

              // 🎨 Color badge for action
              const actionColor =
                entry.action === "Saved"
                  ? "bg-blue-500"
                  : entry.action === "Borrowed"
                  ? "bg-green-500"
                  : entry.action === "Rejected"
                  ? "bg-red-500"
                  : entry.action === "Repaid"
                  ? "bg-orange-500"
                  : entry.action === "Interest"
                  ? "bg-purple-500"
                  : "bg-gray-500";

              // 🎨 Color badge for status
              const statusColor =
                entry.status === "Approved"
                  ? "bg-green-600"
                  : entry.status === "Rejected"
                  ? "bg-red-600"
                  : "bg-gray-500";

              return (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{entry.member}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-white text-xs ${actionColor}`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-2">{entry.amount}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-white text-xs ${statusColor}`}
                    >
                      {entry.status || "Success"}
                    </span>
                  </td>
                  <td className="px-4 py-2">{formattedDate}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
