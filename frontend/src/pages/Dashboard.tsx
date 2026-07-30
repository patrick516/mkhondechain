import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import StatsSection from "@/components/tables/StatsSection";
import ActivityTable from "@/components/tables/ActivityTable";
import RejectModal from "@/components/tables/RejectModal";
import { fetchDashboardStats, fetchRecentActivity } from "@/api/dashboard";
import { fetchPendingLoanRequests } from "@/api/dashboard";
import LoanRequestTable from "@/components/tables/LoanRequestTable";
import { approveLoan, rejectLoan } from "@/api/payments";
import toast from "react-hot-toast";

import type {
  StatItem,
  ActivityItem,
  LoanRequestItem,
} from "@/types/dashboard";

export default function Dashboard() {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequest, setRejectingRequest] =
    useState<LoanRequestItem | null>(null);

  const [stats, setStats] = useState<StatItem[]>([
    { label: "Total Saved", value: "MK 0", bg: "bg-accent" },
    { label: "Total Borrowed", value: "MK 0" },
    { label: "Active Members", value: "0 Members", bg: "bg-overlay" },
    { label: "Outstanding Loans", value: "MK 0", bg: "bg-red-600" },
    { label: "Overdue Loans", value: "0", bg: "bg-yellow-600" },
  ]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loanRequests, setLoanRequests] = useState<LoanRequestItem[]>([]);

  useEffect(() => {
    fetchPendingLoanRequests().then(setLoanRequests).catch(console.error);
    fetchRecentActivity()
      .then(setActivities)
      .catch((err) => {
        console.error("Failed to fetch activity:", err.message);
      });
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const summary = await fetchDashboardStats();
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
          {
            label: "Overdue Loans",
            value: `${summary.overdueLoans}`,
            bg: summary.overdueLoans > 0 ? "bg-yellow-600" : "bg-overlay",
          },
        ]);
      } catch (err: any) {
        console.error("Error refreshing dashboard stats:", err.message);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (request: LoanRequestItem) => {
    try {
      await approveLoan(request.transactionId);
      setLoanRequests((prev) =>
        prev.filter((r) => r.transactionId !== request.transactionId),
      );

      setActivities((prev) => [
        {
          member: request.member,
          action: "Borrowed",
          amount: `MK ${request.amount.toLocaleString()}`,
          status: "success",
          date: new Date().toISOString(),
        },
        ...prev,
      ]);

      toast.success(`Loan approved for ${request.member}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to approve loan");
    }
  };

  const handleReject = async (item: LoanRequestItem, reason: string) => {
    try {
      await rejectLoan(item.transactionId, reason);
      setLoanRequests((prev) =>
        prev.filter((r) => r.transactionId !== item.transactionId),
      );

      setActivities((prev) => [
        {
          member: item.member,
          action: "Rejected",
          amount: `MK ${item.amount.toLocaleString()}`,
          status: "failed",
          date: new Date().toISOString(),
        },
        ...prev,
      ]);

      toast(`Loan rejected for ${item.member}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to reject loan");
    } finally {
      setRejectingRequest(null);
      setShowRejectModal(false);
    }
  };

  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_API_BASE_URL || "http://localhost:4000",
      { auth: { token: localStorage.getItem("mkhonde_token") } },
    );

    socket.on("connect", () => {
      console.log("Connected to socket server");
    });

    socket.on("transaction:new", (data) => {
      console.log("Real-time transaction received:", data);
      fetchDashboardStats().then((summary) => {
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
          {
            label: "Overdue Loans",
            value: `${summary.overdueLoans}`,
            bg: summary.overdueLoans > 0 ? "bg-yellow-600" : "bg-overlay",
          },
        ]);
      });
      fetchRecentActivity().then(setActivities);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

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
      <p className="text-sm text-gray-500 mt-2">
        Loans require group leader approval before disbursement.
      </p>

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
