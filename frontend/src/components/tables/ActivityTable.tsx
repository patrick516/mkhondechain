import type { ActivityItem } from "@/types/dashboard";

interface Props {
  data: ActivityItem[];
}

export default function ActivityTable({ data }: Props) {
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
          {data.map((entry, i) => {
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
