import type { LoanRequestItem } from "@/types/dashboard";

interface Props {
  data: LoanRequestItem[];
  onApprove: (item: LoanRequestItem) => void;
  onReject: (item: LoanRequestItem) => void;
}

export default function LoanRequestTable({ data, onApprove, onReject }: Props) {
  return (
    <div className="mt-8 overflow-x-auto bg-white rounded shadow">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left bg-gray-100">
            <th className="px-4 py-2">Member</th>
            <th className="px-4 py-2">Amount</th>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((req, i) => (
            <tr key={i} className="border-t hover:bg-gray-50">
              <td className="px-4 py-2">{req.member}</td>
              <td className="px-4 py-2">{req.amount}</td>
              <td className="px-4 py-2">{req.date}</td>
              <td className="px-4 py-2">{req.status}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => onApprove(req)}
                  className="px-2 py-1 mr-2 text-xs text-white bg-green-500 rounded"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject(req)}
                  className="px-2 py-1 text-xs text-white bg-red-500 rounded"
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
