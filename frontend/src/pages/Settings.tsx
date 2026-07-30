import { useState, useEffect } from "react";
import axios from "@/api/axios";
import { fetchCycleStatus, startCycle } from "@/api/cycle";
import type { CycleStatus } from "@/api/cycle";
import SettingsTable from "@/components/settings/SettingsTable";
import EditSettingsModal from "@/components/settings/EditSettingsModal";
import DatePicker from "@/components/ui/DatePicker";
import ShareoutModal from "@/components/cycle/ShareoutModal";
import toast from "react-hot-toast";

export default function Settings() {
  const [repayDays, setRepayDays] = useState<number>(30);
  const [interestRate, setInterestRate] = useState<number>(10);
  const [minSaveAmount, setMinSaveAmount] = useState<number>(100);
  const [maxLoanPercent, setMaxLoanPercent] = useState<number>(50);

  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [lastBroadcast, setLastBroadcast] = useState<string>("");
  const [lastBroadcastAt, setLastBroadcastAt] = useState<string>("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [cycle, setCycle] = useState<CycleStatus | null>(null);
  const [newCycleStartDate, setNewCycleStartDate] = useState<Date | null>(
    new Date(),
  );
  const [newCycleEndDate, setNewCycleEndDate] = useState<Date | null>(null);
  const [startingCycle, setStartingCycle] = useState(false);
  const [shareoutOpen, setShareoutOpen] = useState(false);
  const loadCycle = () => {
    fetchCycleStatus()
      .then(setCycle)
      .catch(() => toast.error("Failed to load cycle status"));
  };

  const handleStartCycle = async () => {
    if (!newCycleStartDate) {
      toast.error("Please choose a start date");
      return;
    }
    if (!newCycleEndDate) {
      toast.error("Please choose an end date");
      return;
    }
    if (newCycleEndDate <= newCycleStartDate) {
      toast.error("End date must be after the start date");
      return;
    }
    setStartingCycle(true);
    try {
      await startCycle(
        newCycleStartDate.toISOString(),
        newCycleEndDate.toISOString(),
      );
      toast.success("Cycle started");
      setNewCycleStartDate(new Date());
      setNewCycleEndDate(null);
      loadCycle();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to start cycle");
    } finally {
      setStartingCycle(false);
    }
  };

  useEffect(() => {
    axios
      .get("/dashboard/settings")
      .then((res) => {
        setRepayDays(res.data.repayDays || 30);
        setInterestRate(res.data.interestRate ?? 10);
        setMinSaveAmount(res.data.minSaveAmount ?? 100);
        setMaxLoanPercent(res.data.maxLoanPercent ?? 50);
        setLastBroadcast(res.data.lastBroadcastMessage || "");
        setLastBroadcastAt(res.data.lastBroadcastAt || "");
      })
      .catch((err) => {
        console.error("Failed to load settings:", err.message);
        toast.error("Failed to load settings");
      })
      .finally(() => setLoadingSettings(false));

    loadCycle();
  }, []);

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
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Group Settings</h1>

      <SettingsTable
        repayDays={repayDays}
        interestRate={interestRate}
        minSaveAmount={minSaveAmount}
        maxLoanPercent={maxLoanPercent}
        onEdit={() => setEditOpen(true)}
      />

      <EditSettingsModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        current={{ repayDays, interestRate, minSaveAmount, maxLoanPercent }}
        onSaved={(updated) => {
          setRepayDays(updated.repayDays);
          setInterestRate(updated.interestRate);
          setMinSaveAmount(updated.minSaveAmount);
          setMaxLoanPercent(updated.maxLoanPercent);
        }}
      />

      {/* ── Savings Cycle ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🔄</span>
          <h2 className="text-lg font-semibold text-gray-800">Savings Cycle</h2>
        </div>

        {cycle?.cycleActive ? (
          <div className="ml-9">
            <p className="text-sm text-gray-500 mb-1">
              Cycle started{" "}
              {cycle.cycleStartDate &&
                new Date(cycle.cycleStartDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-700">
              Ends{" "}
              <strong>
                {cycle.cycleEndDate &&
                  new Date(cycle.cycleEndDate).toLocaleDateString()}
              </strong>
              {cycle.daysRemaining !== null && (
                <span className="text-gray-500">
                  {" "}
                  ({cycle.daysRemaining} day
                  {cycle.daysRemaining === 1 ? "" : "s"} remaining)
                </span>
              )}
            </p>
            <button
              onClick={() => setShareoutOpen(true)}
              className="mt-3 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition"
            >
              Review Share-Out
            </button>
          </div>
        ) : (
          <div className="ml-9">
            <p className="text-sm text-gray-500 mb-4">
              No active cycle. Start one once the group has agreed when this
              savings round will end.
            </p>
            <div className="flex items-end gap-3">
              <div className="w-40">
                <label className="block text-xs text-gray-500 mb-1">
                  Start date
                </label>
                <DatePicker
                  selected={newCycleStartDate}
                  onChange={setNewCycleStartDate}
                  placeholder="Select start date"
                />
              </div>
              <div className="w-40">
                <label className="block text-xs text-gray-500 mb-1">
                  End date
                </label>
                <DatePicker
                  selected={newCycleEndDate}
                  onChange={setNewCycleEndDate}
                  minDate={
                    newCycleStartDate
                      ? new Date(
                          newCycleStartDate.getTime() + 24 * 60 * 60 * 1000,
                        )
                      : new Date(Date.now() + 24 * 60 * 60 * 1000)
                  }
                  placeholder="Select end date"
                />
              </div>
              <button
                onClick={handleStartCycle}
                disabled={startingCycle}
                className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {startingCycle ? "Starting..." : "Start Cycle"}
              </button>
            </div>
          </div>
        )}
      </div>

      <ShareoutModal
        open={shareoutOpen}
        onClose={() => setShareoutOpen(false)}
        onClosed={loadCycle}
      />

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
              {broadcasting ? "Sending..." : "📤 Broadcast"}
            </button>
          </div>
        </div>

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
          here. All transactions are secured and multi-party verified. Records
          can only be changed through the USSD system by members directly.
        </p>
      </div>
    </div>
  );
}
