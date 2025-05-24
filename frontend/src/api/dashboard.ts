import axios from "./axios";
import type { ActivityItem } from "@/types/dashboard";

export const fetchTotalMembers = async () => {
  const res = await axios.get("/members");
  console.log("/members response:", res.data);
  return res.data.length;
};

export const fetchTotalSavings = async () => {
  const res = await axios.get("/transactions/total-savings");
  return res.data.totalSavings || 0;
};

export const fetchTotalBorrowed = async () => {
  const res = await axios.get("/transactions/total-borrowed");
  return res.data.totalBorrowed || 0;
};

export const fetchTotalOutstanding = async () => {
  const res = await axios.get("/transactions/total-owing");
  return res.data.totalOwing || 0;
};
export const fetchRecentActivity = async (): Promise<ActivityItem[]> => {
  const res = await axios.get("/transactions/recent");
  return res.data;
};
export const fetchPendingLoanRequests = async () => {
  const res = await axios.get("/transactions/loan-requests");
  return res.data; // should be LoanRequestItem[]
};

export const fetchDashboardStats = async () => {
  const [members, savings, borrowed, owing] = await Promise.all([
    fetchTotalMembers(),
    fetchTotalSavings(),
    fetchTotalBorrowed(),
    fetchTotalOutstanding(),
  ]);

  return {
    totalMembers: members,
    totalSavings: savings || 0,
    totalBorrowed: borrowed || 0,
    totalOwing: owing || 0,
  };
};
