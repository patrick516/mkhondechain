import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import StatsSection from "@/components/tables/StatsSection";
import ActivityTable from "@/components/tables/ActivityTable";
import LoanRequestTable from "@/components/tables/LoanRequestTable";
import RejectModal from "@/components/tables/RejectModal";
import axios from "@/api/axios";
import toast from "react-hot-toast";
import { fetchDashboardStats, fetchRecentActivity } from "@/api/dashboard";
import { fetchPendingLoanRequests } from "@/api/dashboard";

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

  const [stats, setStats] = useState<StatItem[]>([
    { label: "Total Saved", value: "MK 0", bg: "bg-accent" },
    { label: "Total Borrowed", value: "MK 0" },
    { label: "Active Members", value: "0 Members", bg: "bg-overlay" },
    { label: "Outstanding Loans", value: "MK 0", bg: "bg-red-600" },
  ]);

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetchPendingLoanRequests().then(setLoanRequests).catch(console.error);
    fetchRecentActivity()
      .then(setActivities)
      .catch((err) => {
        console.error("Failed to fetch activity:", err.message);
      });
  }, []);

  const [loanRequests, setLoanRequests] = useState<LoanRequestItem[]>([]);

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
        ]);
      } catch (err) {
        console.error("Error refreshing dashboard stats:", err.message);
      }
    };

    loadStats(); // initial load

    const interval = setInterval(loadStats, 15000); // every 15s
    return () => clearInterval(interval); // cleanup
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

  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"
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
        ]);
      });

      fetchRecentActivity().then(setActivities);
    });

    // Listen for real-time loan requests
    socket.on("loan:request", async (request) => {
      console.log("New loan request received via socket:", request);

      const numericAmount = Number(request.amount.replace(/[^\d]/g, ""));

      try {
        const res = await axios.get(
          `/contract/eligible-to-borrow/${request.wallet}`
        );
        const eligibleMWK = res.data.eligibleMWK;

        if (numericAmount <= eligibleMWK) {
          console.log("Auto-approving loan for", request.member);
          handleApprove(request);
        } else {
          console.log("Auto-rejecting loan for", request.member);
          handleReject(request, "Exceeds 80% of allowed savings");
        }
      } catch (err) {
        console.error("Failed to auto-process loan request:", err.message);
      }
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
      {/* <LoanRequestTable
        data={loanRequests}
        onApprove={(request) => setConfirmingRequest(request)}
        onReject={(item) => {
          setRejectingRequest(item);
          setShowRejectModal(true);
        }}
      /> */}
      <p className="text-gray-600">
        All loans are automatically approved or rejected based on blockchain
        eligibility.
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
