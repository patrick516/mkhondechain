import axios from "./axios";
import type { ActivityItem, LoanRequestItem } from "@/types/dashboard";

// GET /api/dashboard/summary — unified stats endpoint
export const fetchDashboardStats = async () => {
  const res = await axios.get("/dashboard/summary");
  return {
    totalMembers: res.data.totalMembers || 0,
    totalSavings: res.data.totalSavings || 0,
    totalBorrowed: res.data.totalBorrowed || 0,
    totalOwing: res.data.totalOwing || 0,
    totalRepaid: res.data.totalRepaid || 0,
    pendingLoans: res.data.pendingLoans || 0,
    activeGroups: res.data.activeGroups || 0,
  };
};

// GET /api/dashboard/recent-activity
export const fetchRecentActivity = async (): Promise<ActivityItem[]> => {
  const res = await axios.get("/dashboard/recent-activity");
  return res.data;
};

// GET /api/transactions/recent — alternative endpoint
export const fetchRecentTransactions = async () => {
  const res = await axios.get("/transactions/recent");
  return res.data;
};

// GET /api/transactions/pending-loans

export const fetchPendingLoanRequests = async (): Promise<
  LoanRequestItem[]
> => {
  const res = await axios.get("/transactions/pending-loans");
  return res.data.map((item: any) => ({
    transactionId: item.transactionId,
    reference: item.reference,
    member: item.member,
    phone: item.phone,
    amount: item.amount, // Now a number from API
    date: item.date,
    status: item.status,
  }));
};
// GET /api/transactions/summary
export const fetchTransactionSummary = async () => {
  const res = await axios.get("/transactions/summary");
  return res.data;
};

// GET /api/transactions/total-savings
export const fetchTotalSavings = async () => {
  const res = await axios.get("/transactions/total-savings");
  return res.data.totalSavings || 0;
};

// GET /api/transactions/total-borrowed
export const fetchTotalBorrowed = async () => {
  const res = await axios.get("/transactions/total-borrowed");
  return res.data.totalBorrowed || 0;
};

// GET /api/transactions/total-owing
export const fetchTotalOutstanding = async () => {
  const res = await axios.get("/transactions/total-owing");
  return res.data.totalOwing || 0;
};

// GET /api/dashboard/settings
export const fetchSettings = async (groupId?: string) => {
  const params = groupId ? { groupId } : {};
  const res = await axios.get("/dashboard/settings", { params });
  return res.data;
};

// PATCH /api/dashboard/settings
export const updateSettings = async (settings: {
  groupId?: string;
  repayDays?: number;
  interestRate?: number;
  minSaveAmount?: number;
  maxLoanPercent?: number;
}) => {
  const res = await axios.patch("/dashboard/settings", settings);
  return res.data;
};

// POST /api/dashboard/broadcast
export const sendBroadcast = async (message: string, groupId?: string) => {
  const res = await axios.post("/dashboard/broadcast", { message, groupId });
  return res.data;
};
