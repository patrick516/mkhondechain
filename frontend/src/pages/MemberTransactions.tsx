import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "@/api/axios";
import toast from "react-hot-toast";

interface Transaction {
  reference: string;
  date: string;
  type: string;
  amount: number;
  status: string;
  method: string;
  beforeBalance: number;
  afterBalance: number;
  note: string;
}

interface MemberDetails {
  fullName: string;
  phone: string;
  gender: string;
  balance: number;
  loanBalance: number;
  joined: string;
}

export default function MemberTransactions() {
  const { memberId } = useParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [member, setMember] = useState<MemberDetails | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    axios
      .get(`/transactions/member/${memberId}`)
      .then((res) => {
        setTransactions(res.data.transactions);
        setMember(res.data.member);
        setPagination(res.data.pagination);
      })
      .catch((err) => {
        console.error("Failed to fetch transactions:", err.message);
        toast.error("Failed to load member transactions.");
      });
  }, [memberId]);

  if (!member) return <p className="p-6">Loading...</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">
        Transaction History for {member.fullName}
      </h1>

      <div className="p-4 mb-6 bg-white rounded shadow">
        <p>
          <strong>Phone:</strong> {member.phone}
        </p>
        <p>
          <strong>Gender:</strong> {member.gender}
        </p>
        <p>
          <strong>Current Balance:</strong> MK {member.balance.toLocaleString()}
        </p>
        <p>
          <strong>Loan Balance:</strong> MK{" "}
          {member.loanBalance.toLocaleString()}
        </p>
        <p>
          <strong>Joined:</strong> {new Date(member.joined).toDateString()}
        </p>
      </div>

      {/* Transactions Table */}
      <div className="p-4 overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Reference</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Method</th>
              <th className="px-4 py-2 text-left">Balance Before</th>
              <th className="px-4 py-2 text-left">Balance After</th>
              <th className="px-4 py-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.reference} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{tx.reference}</td>
                <td className="px-4 py-2">
                  {new Date(tx.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 capitalize">{tx.type}</td>
                <td className="px-4 py-2">MK {tx.amount.toLocaleString()}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      tx.status === "success"
                        ? "bg-green-100 text-green-800"
                        : tx.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : tx.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td className="px-4 py-2">{tx.method}</td>
                <td className="px-4 py-2">
                  MK {tx.beforeBalance.toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  MK {tx.afterBalance.toLocaleString()}
                </td>
                <td className="px-4 py-2">{tx.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                className={`px-3 py-1 rounded ${
                  page === pagination.page
                    ? "bg-primary text-white"
                    : "bg-gray-200"
                }`}
              >
                {page}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
