import type { LoanRequestItem } from "@/types/dashboard";

interface Props {
  data: LoanRequestItem[];
  onApprove?: (item: LoanRequestItem) => void;
  onReject?: (item: LoanRequestItem) => void;
}

export default function LoanRequestTable({ data, onApprove, onReject }: Props) {
  const isActionable = !!onApprove || !!onReject;

  return (
    <div className="mt-8 overflow-x-auto bg-white rounded shadow">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left bg-gray-100">
            <th className="px-4 py-2">Member</th>
            <th className="px-4 py-2">Phone</th>
            <th className="px-4 py-2">Amount</th>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Status</th>
            {isActionable && <th className="px-4 py-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={isActionable ? 6 : 5}
                className="px-4 py-8 text-center text-gray-500"
              >
                No loan requests found
              </td>
            </tr>
          ) : (
            data.map((req) => (
              <tr key={req.transactionId} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{req.member}</td>
                <td className="px-4 py-2">{req.phone || "-"}</td>
                <td className="px-4 py-2">MK {req.amount.toLocaleString()}</td>
                <td className="px-4 py-2">
                  {new Date(req.date).toLocaleString("en-MW")}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-white text-xs ${
                      req.status === "success"
                        ? "bg-green-600"
                        : req.status === "failed" || req.status === "reversed"
                          ? "bg-red-500"
                          : req.status === "pending"
                            ? "bg-yellow-500"
                            : "bg-gray-400"
                    }`}
                  >
                    {req.status}
                  </span>
                </td>
                {isActionable && (
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      {onApprove && req.status === "pending" && (
                        <button
                          onClick={() => onApprove(req)}
                          className="px-3 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                      )}
                      {onReject && req.status === "pending" && (
                        <button
                          onClick={() => onReject(req)}
                          className="px-3 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
