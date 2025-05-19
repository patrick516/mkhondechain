import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "@/api/axios";
import toast from "react-hot-toast";

import type {
  Transaction,
  Summary,
  MemberDetails,
} from "@/types/memberTransactions";

export default function MemberTransactions() {
  const { memberId } = useParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [member, setMember] = useState<MemberDetails | null>(null);

  useEffect(() => {
    axios
      .get(`/transactions/member/${memberId}`)
      .then((res) => {
        setTransactions(res.data.transactions);
        setSummary(res.data.summary);
        setMember(res.data.member);
      })
      .catch((err) => {
        console.error("Failed to fetch transactions:", err.message);
        toast.error("Failed to load member transactions.");
      });
  }, [memberId]);

  if (!member || !summary) return <p className="p-6">Loading...</p>;

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
          <strong>Wallet Address:</strong> {member.ethAddress}
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
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Repaid</th>
              <th className="px-4 py-2 text-left">Interest</th>
              <th className="px-4 py-2 text-left">Total</th>
              <th className="px-4 py-2 text-left">Method</th>
              <th className="px-4 py-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  {new Date(tx.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 capitalize">{tx.type}</td>
                <td className="px-4 py-2">MK {tx.amount.toLocaleString()}</td>
                <td className="px-4 py-2">
                  {tx.repaid ? `MK ${tx.repaid}` : "-"}
                </td>
                <td className="px-4 py-2">
                  {tx.interest ? `MK ${tx.interest}` : "-"}
                </td>
                <td className="px-4 py-2">
                  MK {tx.totalOnDay.toLocaleString()}
                </td>
                <td className="px-4 py-2">{tx.method}</td>
                <td className="px-4 py-2">{tx.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="p-6 mt-8 text-sm leading-relaxed bg-white rounded shadow">
        <p>
          As of <strong>{new Date().toDateString()}</strong>,{" "}
          <strong>{member.fullName}</strong> has:
        </p>
        <ul className="my-2 list-disc list-inside">
          <li>
            <strong>Total Borrowed:</strong> MK{" "}
            {summary.totalBorrowed.toLocaleString()}
          </li>
          <li>
            <strong>Total Repaid:</strong> MK{" "}
            {summary.totalRepaid.toLocaleString()}
          </li>
          <li>
            <strong>Outstanding Balance:</strong> MK{" "}
            {summary.totalOwing.toLocaleString()}
          </li>
          <li>
            <strong>Total Savings:</strong> MK{" "}
            {summary.totalSavings.toLocaleString()}
          </li>
          <li>
            <strong>Interest Earned:</strong> MK{" "}
            {summary.totalInterest.toLocaleString()}
          </li>
          <li>
            <strong>Total Savings + Interest:</strong> MK{" "}
            {summary.totalWithInterest.toLocaleString()}
          </li>
        </ul>

        <p className="mt-4 italic text-blue-600">{summary.conclusion}</p>
      </div>
    </div>
  );
}
