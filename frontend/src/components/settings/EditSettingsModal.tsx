import { useState, useEffect } from "react";
import axios from "@/api/axios";
import Modal from "@/components/ui/Modal";
import toast from "react-hot-toast";

interface EditSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (updated: {
    repayDays: number;
    interestRate: number;
    minSaveAmount: number;
    maxLoanPercent: number;
  }) => void;
  current: {
    repayDays: number;
    interestRate: number;
    minSaveAmount: number;
    maxLoanPercent: number;
  };
}

export default function EditSettingsModal({
  open,
  onClose,
  onSaved,
  current,
}: EditSettingsModalProps) {
  const [repayDays, setRepayDays] = useState(current.repayDays);
  const [interestRate, setInterestRate] = useState(current.interestRate);
  const [minSaveAmount, setMinSaveAmount] = useState(current.minSaveAmount);
  const [maxLoanPercent, setMaxLoanPercent] = useState(current.maxLoanPercent);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRepayDays(current.repayDays);
      setInterestRate(current.interestRate);
      setMinSaveAmount(current.minSaveAmount);
      setMaxLoanPercent(current.maxLoanPercent);
    }
  }, [open, current]);

  const handleSave = async () => {
    if (repayDays < 1 || repayDays > 365) {
      toast.error("Repay days must be between 1 and 365");
      return;
    }
    if (interestRate < 0 || interestRate > 100) {
      toast.error("Interest rate must be between 0 and 100");
      return;
    }
    if (minSaveAmount < 1) {
      toast.error("Minimum save amount must be at least 1");
      return;
    }
    if (maxLoanPercent < 0 || maxLoanPercent > 100) {
      toast.error("Max loan percent must be between 0 and 100");
      return;
    }

    setSaving(true);
    try {
      const res = await axios.patch("/dashboard/settings", {
        repayDays,
        interestRate,
        minSaveAmount,
        maxLoanPercent,
      });
      toast.success("Settings updated");
      onSaved(res.data.settings);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Loan Settings">
      <p className="text-sm text-gray-500 mb-6">
        These are decided by the group at their meeting, then applied here.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Loan Repayment Period (days)
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={repayDays}
            onChange={(e) => setRepayDays(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interest Rate (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Save Amount (MK)
          </label>
          <input
            type="number"
            min={1}
            value={minSaveAmount}
            onChange={(e) => setMinSaveAmount(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Loan (% of member's savings)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={maxLoanPercent}
            onChange={(e) => setMaxLoanPercent(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}
