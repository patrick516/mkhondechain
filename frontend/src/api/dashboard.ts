import axios from "./axios";

export const fetchTotalMembers = async () => {
  const res = await axios.get("/members");
  console.log("/members response:", res.data);
  return res.data.length;
};

export const fetchTotalSavings = async () => {
  const res = await axios.get("/transactions/total-savings");
  console.log("/transactions/total-borrowed:", res.data);
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

export const fetchDashboardStats = async () => {
  const members = await fetchTotalMembers();

  return {
    totalMembers: members,
    totalSavings: 0,
    totalBorrowed: 0,
    totalOwing: 0,
  };
};
