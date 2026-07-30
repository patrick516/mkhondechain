import { useState, useEffect } from "react";
import { fetchShareoutPreview, closeCycle } from "@/api/cycle";
import type { ShareoutPreview } from "@/api/cycle";
import Modal from "@/components/ui/Modal";
import toast from "react-hot-toast";

interface ShareoutModalProps {
  open: boolean;
  onClose: () => void;
  onClosed: () => void;
}

export default function ShareoutModal({
  open,
  onClose,
  onClosed,
}: ShareoutModalProps) {
  const [preview, setPreview] = useState<ShareoutPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState<"review" | "confirm">("review");

  useEffect(() => {
    if (open) {
      setStep("review");
      setLoading(true);
      fetchShareoutPreview()
        .then(setPreview)
        .catch(() => toast.error("Failed to load share-out preview"))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleConfirmClose = async () => {
    setConfirming(true);
    try {
      const result = await closeCycle();
      toast.success(result.message);
      onClosed();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to close cycle");
    } finally {
      setConfirming(false);
    }
  };

  const membersWithCarryover =
    preview?.members.filter((m) => m.remainingLoanBalance > 0) || [];

  return (
    <Modal open={open} onClose={onClose} title="Share-Out Preview">
      {loading ? (
        <p className="text-gray-500 text-sm">Calculating...</p>
      ) : preview ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500">Total Fund Value</p>
              <p className="text-lg font-bold text-gray-900">
                MK {preview.totalPotValue.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500">Cash Payout</p>
              <p className="text-lg font-bold text-gray-900">
                MK {preview.totalCashPayout.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500">Outstanding Loans</p>
              <p className="text-lg font-bold text-gray-900">
                MK {preview.totalOutstandingLoans.toLocaleString()}
              </p>
            </div>
          </div>

          {membersWithCarryover.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-800 font-semibold mb-1">
                ⚠️ {membersWithCarryover.length} member(s) will carry an unpaid
                balance into the next cycle
              </p>
              <p className="text-xs text-amber-700">
                Their share wasn't enough to fully cover what they owe. Review
                below before closing — you may want to wait and give them time
                to repay instead.
              </p>
            </div>
          )}

          <div className="overflow-x-auto max-h-72 overflow-y-auto border border-gray-100 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Saved</th>
                  <th className="px-4 py-2 font-medium">Share</th>
                  <th className="px-4 py-2 font-medium">Owed</th>
                  <th className="px-4 py-2 font-medium">Payout</th>
                  <th className="px-4 py-2 font-medium">Carries Over</th>
                </tr>
              </thead>
              <tbody>
                {preview.members.map((m) => (
                  <tr key={m.memberId} className="border-t border-gray-50">
                    <td className="px-4 py-2 text-gray-800">
                      {m.firstName} {m.surname}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      MK {m.totalSaved.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      MK {m.entitledShare.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {m.owedIncludingInterest > 0
                        ? `MK ${m.owedIncludingInterest.toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="px-4 py-2 font-semibold text-green-700">
                      MK {m.cashPayout.toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {m.remainingLoanBalance > 0 ? (
                        <span className="text-red-600 font-semibold">
                          MK {m.remainingLoanBalance.toLocaleString()}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {step === "review" ? (
            <div className="flex justify-end gap-3 pt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Not yet — keep cycle open
              </button>
              <button
                onClick={() => setStep("confirm")}
                className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90"
              >
                Proceed to Close Cycle
              </button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
              <p className="text-sm text-red-800 font-semibold mb-3">
                This cannot be undone. Payouts will be recorded, member balances
                reset for the new cycle, and this cycle closed.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStep("review")}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Back
                </button>
                <button
                  onClick={handleConfirmClose}
                  disabled={confirming}
                  className="px-5 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {confirming ? "Closing..." : "Confirm: Close Cycle"}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 text-sm">Could not load preview.</p>
      )}
    </Modal>
  );
}
