// File: frontend/src/pages/Disputes.tsx

import { useEffect, useState } from "react";
import { fetchDisputes, resolveDispute } from "@/api/disputes";
import type { DisputeItem } from "@/api/disputes";
import toast from "react-hot-toast";

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  investigating: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function Disputes() {
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<DisputeItem | null>(null);
  const [note, setNote] = useState("");

  const load = () => {
    setLoading(true);
    fetchDisputes()
      .then(setDisputes)
      .catch(() => toast.error("Failed to load disputes"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleResolve = async (status: "resolved" | "rejected") => {
    if (!active) return;
    try {
      await resolveDispute(active.id, status, note);
      toast.success(`Dispute marked ${status}`);
      setActive(null);
      setNote("");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update dispute");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Problems members have flagged via USSD, awaiting review.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left px-6 py-2">Member</th>
              <th className="text-left px-6 py-2">Description</th>
              <th className="text-left px-6 py-2">Transaction</th>
              <th className="text-left px-6 py-2">Status</th>
              <th className="text-left px-6 py-2">Date</th>
              <th className="text-right px-6 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : disputes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
                  No disputes reported.
                </td>
              </tr>
            ) : (
              disputes.map((d) => (
                <tr key={d.id} className="border-t border-gray-100">
                  <td className="px-6 py-2">
                    {d.member}
                    <br />
                    <span className="text-gray-400 text-xs">{d.phone}</span>
                  </td>
                  <td className="px-6 py-2">{d.description}</td>
                  <td className="px-6 py-2 text-gray-500">
                    {d.transactionReference || "—"}
                  </td>
                  <td className="px-6 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${statusColors[d.status]}`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-2 text-gray-500">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-2 text-right">
                    {(d.status === "open" || d.status === "investigating") && (
                      <button
                        onClick={() => setActive(d)}
                        className="text-primary underline text-xs"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {active && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Resolve Dispute</h2>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{active.member}</strong> ({active.phone})
            </p>
            <p className="text-sm text-gray-700 mb-4">{active.description}</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Resolution note…"
              className="w-full border rounded-lg p-2 text-sm mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActive(null)}
                className="px-4 py-2 text-sm rounded-lg border"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve("rejected")}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white"
              >
                Reject
              </button>
              <button
                onClick={() => handleResolve("resolved")}
                className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
