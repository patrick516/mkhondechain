import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { ActivityItem } from "@/types/dashboard";

interface Props {
  data: ActivityItem[];
}

const socket = io("http://localhost:4000"); // Adjust if deployed

export default function ActivityTable({ data }: Props) {
  const [activity, setActivity] = useState<ActivityItem[]>(data);

  useEffect(() => {
    socket.on("transaction:new", (newEntry: ActivityItem) => {
      setActivity((prev) => [newEntry, ...prev.slice(0, 49)]);
    });

    return () => {
      socket.off("transaction:new");
    };
  }, []);

  return (
    <div className="overflow-x-auto bg-white rounded shadow">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left bg-gray-100">
            <th className="px-4 py-2">Member</th>
            <th className="px-4 py-2">Action</th>
            <th className="px-4 py-2">Amount</th>
            <th className="px-4 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {activity.map((entry, i) => {
            const date = new Date(entry.date).toLocaleString("en-MW", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{entry.member}</td>
                <td className="px-4 py-2">{entry.action}</td>
                <td className="px-4 py-2">{entry.amount}</td>
                <td className="px-4 py-2">{date}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
