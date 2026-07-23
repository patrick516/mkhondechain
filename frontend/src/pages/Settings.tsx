import { useState, useEffect } from "react";
import axios from "@/api/axios";
import toast from "react-hot-toast";

export default function Settings() {
  const [repayDays, setRepayDays] = useState<number>(30);
  const [savedRepayDays, setSavedRepayDays] = useState<number>(30);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [lastBroadcast, setLastBroadcast] = useState<string>("");
  const [lastBroadcastAt, setLastBroadcastAt] = useState<string>("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingRepay, setSavingRepay] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  // ── Load current settings ──────────────────────────────────
  useEffect(() => {
    axios
      .get("/dashboard/settings")
      .then((res) => {
        setRepayDays(res.data.repayDays || 30);
        setSavedRepayDays(res.data.repayDays || 30);
        setLastBroadcast(res.data.lastBroadcastMessage || "");
        setLastBroadcastAt(res.data.lastBroadcastAt || "");
      })
      .catch((err) => {
        console.error("Failed to load settings:", err.message);
        toast.error("Failed to load settings");
      })
      .finally(() => setLoadingSettings(false));
  }, []);

  // ── Save repay days ────────────────────────────────────────
  const handleSaveRepayDays = async () => {
    if (repayDays < 1 || repayDays > 365) {
      toast.error("Repay days must be between 1 and 365");
      return;
    }
    setSavingRepay(true);
    try {
      const res = await axios.patch("/dashboard/settings", { repayDays });
      setSavedRepayDays(res.data.repayDays);
      toast.success(`Repayment period updated to ${res.data.repayDays} days`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update settings");
    } finally {
      setSavingRepay(false);
    }
  };

  // ── Broadcast message ──────────────────────────────────────
  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }
    if (broadcastMessage.trim().length > 160) {
      toast.error("Message too long. Maximum 160 characters.");
      return;
    }

    setBroadcasting(true);
    try {
      const res = await axios.post("/dashboard/broadcast", {
        message: broadcastMessage,
      });
      toast.success(res.data.message);
      setLastBroadcast(broadcastMessage.trim());
      setLastBroadcastAt(new Date().toISOString());
      setBroadcastMessage("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to send message");
    } finally {
      setBroadcasting(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Group Settings</h1>

      {/* ── Loan Repayment Period ───────────────────────────── */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📅</span>
          <h2 className="text-lg font-semibold text-gray-800">
            Loan Repayment Period
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-4 ml-9">
          Set how many days members have to repay a loan. This is decided by the
          group at their meeting. Currently:{" "}
          <strong>{savedRepayDays} days</strong>
        </p>

        <div className="flex items-center gap-3 ml-9">
          <input
            type="number"
            min={1}
            max={365}
            value={repayDays}
            onChange={(e) => setRepayDays(Number(e.target.value))}
            className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm text-gray-500">days</span>
          <button
            onClick={handleSaveRepayDays}
            disabled={savingRepay || repayDays === savedRepayDays}
            className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingRepay ? "Saving..." : "Save"}
          </button>
        </div>

        {repayDays !== savedRepayDays && (
          <p className="text-xs text-amber-500 mt-2 ml-9">
            ⚠️ You have unsaved changes
          </p>
        )}
      </div>

      {/* ── Broadcast Message ───────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📢</span>
          <h2 className="text-lg font-semibold text-gray-800">
            Send Message to All Members
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-4 ml-9">
          Send an SMS to every member in the group. Use this for meeting
          announcements, reminders, or important notices. Max 160 characters.
        </p>

        <div className="ml-9 space-y-3">
          <textarea
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="e.g. Meeting tomorrow at 6am at the usual place. Bring your cards."
            rows={4}
            maxLength={160}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${broadcastMessage.length > 140 ? "text-red-500" : "text-gray-400"}`}
            >
              {broadcastMessage.length}/160 characters
            </span>
            <button
              onClick={handleBroadcast}
              disabled={broadcasting || !broadcastMessage.trim()}
              className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {broadcasting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Sending...
                </>
              ) : (
                <>📤 Broadcast</>
              )}
            </button>
          </div>
        </div>

        {/* Last broadcast info */}
        {lastBroadcast && (
          <div className="ml-9 mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">
              Last message sent:{" "}
              {lastBroadcastAt
                ? new Date(lastBroadcastAt).toLocaleString()
                : ""}
            </p>
            <p className="text-sm text-gray-700 italic">"{lastBroadcast}"</p>
          </div>
        )}
      </div>

      {/* ── Info Card ───────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <p className="text-sm text-blue-700 font-medium mb-1">
          ℹ️ Important Note
        </p>
        <p className="text-sm text-blue-600">
          Financial records — savings, loans, and repayments — cannot be edited
          here. All transactions are secured with cryptographic signatures and
          multi-party verification. Records can only be changed through the USSD
          system by members directly.
        </p>
      </div>
    </div>
  );
}
