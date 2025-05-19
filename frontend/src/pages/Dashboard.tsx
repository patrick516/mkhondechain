import { useState } from "react";
import StatsSection from "@/components/tables/StatsSection";
import ActivityTable from "@/components/tables/ActivityTable";
import LoanRequestTable from "@/components/tables/LoanRequestTable";
import RejectModal from "@/components/tables/RejectModal";
import axios from "@/api/axios";
import toast from "react-hot-toast";

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

  const stats: StatItem[] = [
    { label: "Total Saved", value: "MK 150,000", bg: "bg-accent" },
    { label: "Total Borrowed", value: `MK ${approvedTotal.toLocaleString()}` },
    { label: "Active Members", value: "35 Members", bg: "bg-overlay" },
    { label: "Outstanding Loans", value: "MK 20,000", bg: "bg-red-600" },
  ];

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
        onApprove={handleApprove}
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
    </div>
  );
}
