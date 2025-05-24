import { useState, useEffect } from "react";
import StatsSection from "@/components/tables/StatsSection";
import ActivityTable from "@/components/tables/ActivityTable";
import LoanRequestTable from "@/components/tables/LoanRequestTable";
import RejectModal from "@/components/tables/RejectModal";
import axios from "@/api/axios";
import toast from "react-hot-toast";
import { fetchDashboardStats } from "@/api/dashboard";

import type {
  StatItem,
  ActivityItem,
  LoanRequestItem,
} from "@/types/dashboard";

export default function Dashboard() {
  const [approvedTotal, setApprovedTotal] = useState(80000);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequest, setRejectingRequest] =
    useState<LoanRequestItem | null>(null);
  const [confirmingRequest, setConfirmingRequest] =
    useState<LoanRequestItem | null>(null);

  const [stats, setStats] = useState<StatItem[]>([
    { label: "Total Saved", value: "MK 0", bg: "bg-accent" },
    { label: "Total Borrowed", value: "MK 0" },
    { label: "Active Members", value: "0 Members", bg: "bg-overlay" },
    { label: "Outstanding Loans", value: "MK 0", bg: "bg-red-600" },
  ]);

  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      member: "Grace",
      action: "Saved",
      amount: "MK 2,000",
      date: "2025-05-17",
    },
  ]);

  const [loanRequests, setLoanRequests] = useState<LoanRequestItem[]>([
    {
      member: "Doreen",
      amount: "MK 5,000",
      date: "2025-05-16",
      status: "Pending",
    },
    {
      member: "Chikondi",
      amount: "MK 3,000",
      date: "2025-05-15",
      status: "Pending",
    },
  ]);

  useEffect(() => {
    fetchDashboardStats().then((summary) => {
      console.log(" DASHBOARD SUMMARY:", summary); // 🧠 Should show totalMembers: 8

      setStats([
        {
          label: "Total Saved",
          value: `MK ${summary.totalSavings.toLocaleString()}`,
          bg: "bg-accent",
        },
        {
          label: "Total Borrowed",
          value: `MK ${summary.totalBorrowed.toLocaleString()}`,
        },
        {
          label: "Active Members",
          value: `${summary.totalMembers} Members`,
          bg: "bg-overlay",
        },
        {
          label: "Outstanding Loans",
          value: `MK ${summary.totalOwing.toLocaleString()}`,
          bg: "bg-red-600",
        },
      ]);
    });
  }, []);

  const handleApprove = (request: LoanRequestItem) => {
    setLoanRequests((prev) => prev.filter((r) => r !== request));

    const numericAmount = Number(request.amount.replace(/[^\d]/g, ""));
    setApprovedTotal((prev) => prev + numericAmount);

    setActivities((prev) => [
      ...prev,
      {
        member: request.member,
        action: "Borrowed",
        amount: request.amount,
        date: new Date().toISOString().slice(0, 10),
      },
    ]);

    toast.success(`Loan approved for ${request.member}`);
  };

  const handleReject = (item: LoanRequestItem, reason: string) => {
    const updatedRequest = {
      ...item,
      status: "Rejected",
      rejectionReason: reason,
    };

    setLoanRequests((prev) => prev.filter((r) => r !== item));

    setActivities((prev) => [
      ...prev,
      {
        member: updatedRequest.member,
        action: "Rejected",
        amount: updatedRequest.amount,
        date: new Date().toISOString().slice(0, 10),
      },
    ]);

    axios
      .post("/loans/reject", {
        phoneNumber: item.memberPhone,
        amount: item.amount,
        reason,
      })
      .then(() => console.log("SMS sent"))
      .catch((err) => console.error("SMS failed", err.message));

    setRejectingRequest(null);
    setShowRejectModal(false);

    toast(`Loan rejected for ${item.member}`);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard Overview</h1>

      <StatsSection stats={stats} />

      <h2 className="mt-10 mb-4 text-lg font-semibold">
        Pending Loan Requests
      </h2>
      <LoanRequestTable
        data={loanRequests}
        onApprove={(request) => setConfirmingRequest(request)}
        onReject={(item) => {
          setRejectingRequest(item);
          setShowRejectModal(true);
        }}
      />

      <h2 className="mt-10 mb-4 text-lg font-semibold">Recent Activity</h2>
      <ActivityTable data={activities} />

      <RejectModal
        isOpen={showRejectModal}
        onClose={() => {
          setRejectingRequest(null);
          setShowRejectModal(false);
        }}
        onConfirm={(reason) => {
          if (rejectingRequest) handleReject(rejectingRequest, reason);
        }}
      />

      {confirmingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md p-6 bg-white rounded shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">Confirm Approval</h2>
            <p className="mb-4 text-sm text-gray-700">
              You are about to send <strong>{confirmingRequest.amount}</strong>{" "}
              to <strong>{confirmingRequest.member}</strong>. This amount will
              be deducted from the group wallet.
              <br />
              <br />
              Do you want to proceed?
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 text-gray-600 border rounded"
                onClick={() => setConfirmingRequest(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-white rounded bg-primary"
                onClick={() => {
                  handleApprove(confirmingRequest);
                  setConfirmingRequest(null);
                }}
              >
                Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
