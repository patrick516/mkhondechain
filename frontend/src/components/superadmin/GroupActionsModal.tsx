import { useState, useEffect } from "react";
import { resetLeaderPassword } from "@/api/groups";
import type { Group } from "@/api/groups";
import Modal from "@/components/ui/Modal";
import toast from "react-hot-toast";

interface GroupActionsModalProps {
  group: Group | null;
  onClose: () => void;
  onToggleStatus: (group: Group) => void;
  togglingId: string | null;
}

export default function GroupActionsModal({
  group,
  onClose,
  onToggleStatus,
  togglingId,
}: GroupActionsModalProps) {
  const [view, setView] = useState<"details" | "reset">("details");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset internal view whenever a different group is opened
  useEffect(() => {
    if (group) {
      setView("details");
      setNewPassword("");
    }
  }, [group]);

  const handleSavePassword = async () => {
    if (!group) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const result = await resetLeaderPassword(group.id, newPassword);
      toast.success(result.message);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendClick = () => {
    if (!group) return;
    onToggleStatus(group);
    onClose();
  };

  if (!group) return null;

  return (
    <Modal
      open={!!group}
      onClose={onClose}
      title={view === "details" ? group.name : `Reset Password — ${group.name}`}
    >
      {view === "details" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Location</p>
              <p className="text-gray-900 font-medium">{group.location}</p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <span
                className={`inline-block text-xs px-3 py-1 rounded-full mt-0.5 ${
                  group.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {group.status}
              </span>
            </div>
            <div>
              <p className="text-gray-500">Leader</p>
              <p className="text-gray-900 font-medium">{group.leader}</p>
            </div>
            <div>
              <p className="text-gray-500">Members</p>
              <p className="text-gray-900 font-medium">{group.memberCount}</p>
            </div>
            <div>
              <p className="text-gray-500">Fund Balance</p>
              <p className="text-gray-900 font-medium">
                MK {group.fundBalance.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Created</p>
              <p className="text-gray-900 font-medium">
                {new Date(group.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <button
              onClick={() => setView("reset")}
              className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset leader password
            </button>
            <button
              onClick={handleSuspendClick}
              disabled={togglingId === group.id}
              className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {togglingId === group.id
                ? "Updating..."
                : group.status === "active"
                  ? "Suspend group"
                  : "Reactivate group"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            This sets a new password for <strong>{group.leader}</strong> and
            clears any login lockout.
          </p>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 8 characters)"
            autoComplete="new-password"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-between">
            <button
              onClick={() => setView("details")}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <button
              onClick={handleSavePassword}
              disabled={saving}
              className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Password"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
