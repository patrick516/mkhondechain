import {
  fetchSystemStats,
  fetchReconciliationConfig,
  updateReconciliationConfig,
  fetchPlatformFees,
} from "@/api/groups";
import type {
  SystemStats,
  ReconciliationConfig,
  PlatformFeesSummary,
} from "@/api/groups";
import StatsCards from "@/components/superadmin/StatsCards";
import GroupAnalytics from "@/components/superadmin/GroupAnalytics";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

export default function SuperadminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [config, setConfig] = useState<ReconciliationConfig | null>(null);
  const [knownBalanceInput, setKnownBalanceInput] = useState("");
  const [savingBalance, setSavingBalance] = useState(false);
  const [platformFees, setPlatformFees] = useState<PlatformFeesSummary | null>(
    null,
  );

  const loadConfig = () => {
    fetchReconciliationConfig()
      .then((c) => {
        setConfig(c);
        setKnownBalanceInput(String(c.knownMobileMoneyBalance));
      })
      .catch(() => toast.error("Failed to load reconciliation config"));
  };

  useEffect(() => {
    fetchSystemStats()
      .then(setStats)
      .catch(() => toast.error("Failed to load system stats"));
    loadConfig();
    fetchPlatformFees()
      .then(setPlatformFees)
      .catch(() => toast.error("Failed to load platform fees"));
  }, []);
  const handleSaveBalance = async () => {
    const value = Number(knownBalanceInput);
    if (isNaN(value) || value < 0) {
      toast.error("Enter a valid, non-negative number");
      return;
    }
    setSavingBalance(true);
    try {
      await updateReconciliationConfig(value);
      toast.success("Known balance updated");
      loadConfig();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Failed to update known balance",
      );
    } finally {
      setSavingBalance(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          System-wide overview across every village bank.
        </p>
      </div>

      <StatsCards stats={stats} />
      <GroupAnalytics />

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">💰</span>
          <h2 className="text-lg font-semibold text-gray-800">
            Platform Earnings
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-4 ml-9">
          iMoSyS's 2% share of interest collected on repaid loans, across all
          village banks.
        </p>

        <div className="ml-9">
          <p className="text-3xl font-bold text-primary">
            MK{" "}
            {(platformFees?.totalPlatformFeesCollected || 0).toLocaleString()}
          </p>
        </div>

        {platformFees && platformFees.byGroup.length > 0 && (
          <div className="ml-9 mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="py-2 pr-4">Group</th>
                  <th className="py-2 pr-4">Fee Transactions</th>
                  <th className="py-2">Total Fees</th>
                </tr>
              </thead>
              <tbody>
                {platformFees.byGroup.map((g) => (
                  <tr key={g.groupId} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-gray-800">{g.groupName}</td>
                    <td className="py-2 pr-4 text-gray-600">
                      {g.feeTransactionCount}
                    </td>
                    <td className="py-2 text-gray-800 font-medium">
                      MK {g.totalFees.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Vault Reconciliation ─────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🔒</span>
          <h2 className="text-lg font-semibold text-gray-800">
            Vault Reconciliation
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-4 ml-9">
          The nightly reconciliation job compares the ledger's total savings
          against this manually-entered known balance from the real mobile money
          account. Update it whenever the actual account balance changes, so the
          nightly check stays accurate.
        </p>

        <div className="ml-9 flex items-end gap-3">
          <div className="w-56">
            <label className="block text-xs text-gray-500 mb-1">
              Known mobile money balance (MK)
            </label>
            <input
              type="number"
              min={0}
              value={knownBalanceInput}
              onChange={(e) => setKnownBalanceInput(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleSaveBalance}
            disabled={savingBalance}
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {savingBalance ? "Saving..." : "Save"}
          </button>
        </div>

        {config?.updatedAt && (
          <p className="ml-9 mt-3 text-xs text-gray-400">
            Last updated {new Date(config.updatedAt).toLocaleString()}
            {config.updatedByUsername && ` by ${config.updatedByUsername}`}
          </p>
        )}
      </div>
    </div>
  );
}
