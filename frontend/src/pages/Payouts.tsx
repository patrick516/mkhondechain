import { useEffect, useState } from "react";
import { fetchPayoutHistory, downloadPayoutsPdf } from "@/api/payouts";
import type { PayoutRecord } from "@/api/payouts";
import toast from "react-hot-toast";
export default function Payouts() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadPayoutsPdf();
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };
  useEffect(() => {
    fetchPayoutHistory()
      .then(setPayouts)
      .catch(() => toast.error("Failed to load payout history"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = payouts.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.surname.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payout History</h1>
        <button
          onClick={handleExport}
          disabled={exporting || payouts.length === 0}
          className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export to PDF"}
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by member name or phone..."
          className="w-full md:w-1/3 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {loading ? (
          <p className="text-gray-500 text-sm p-6">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-sm p-6">
            No payouts recorded yet — this fills in once a savings cycle is
            closed.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Member</th>
                  <th className="px-6 py-3 font-medium">Cycle</th>
                  <th className="px-6 py-3 font-medium">Entitled Share</th>
                  <th className="px-6 py-3 font-medium">Loan Offset</th>
                  <th className="px-6 py-3 font-medium">Cash Payout</th>
                  <th className="px-6 py-3 font-medium">Carried Over</th>
                  <th className="px-6 py-3 font-medium">Closed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      {p.firstName} {p.surname}
                      <div className="text-xs text-gray-400 font-normal">
                        {p.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(p.cycleStartDate).toLocaleDateString()} –{" "}
                      {new Date(p.cycleEndDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      MK {p.entitledShare.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {p.loanOffset > 0
                        ? `MK ${p.loanOffset.toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-700">
                      MK {p.cashPayout.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {p.remainingLoanBalance > 0 ? (
                        <span className="text-red-600 font-semibold">
                          MK {p.remainingLoanBalance.toLocaleString()}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
