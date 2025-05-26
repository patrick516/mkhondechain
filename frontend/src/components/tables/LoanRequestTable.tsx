import type { LoanRequestItem } from "@/types/dashboard";

interface Props {
  data: LoanRequestItem[];
}

export default function LoanRequestTable({ data }: Props) {
  return (
    <div className="mt-8 overflow-x-auto bg-white rounded shadow">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left bg-gray-100">
            <th className="px-4 py-2">Member</th>
            <th className="px-4 py-2">Amount</th>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((req, i) => (
            <tr key={i} className="border-t hover:bg-gray-50">
              <td className="px-4 py-2">{req.member}</td>
              <td className="px-4 py-2">{req.amount}</td>
              <td className="px-4 py-2">
                {new Date(req.date).toLocaleString("en-MW")}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 rounded text-white text-xs ${
                    req.status === "Approved"
                      ? "bg-green-600"
                      : req.status === "Rejected"
                      ? "bg-red-500"
                      : "bg-gray-400"
                  }`}
                >
                  {req.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
