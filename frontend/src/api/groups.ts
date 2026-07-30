import axios from "@/api/axios";

export interface Group {
  id: string;
  name: string;
  location: string;
  status: string;
  leader: string;
  memberCount: number;
  fundBalance: number;
  createdAt: string;
}

export interface CreateGroupPayload {
  name: string;
  location: string;
  leaderUsername: string;
  leaderFullName: string;
  leaderPassword: string;
  leaderPhone?: string;
}

export interface SystemStats {
  totalGroups: number;
  activeGroups: number;
  totalMembers: number;
  totalSystemSavings: number;
  totalOutstandingLoans: number;
  totalEverSaved: number;
  totalEverRepaid: number;
  pendingLoansAcrossAllGroups: number;
}

export interface GroupAnalyticsRow {
  id: string;
  name: string;
  location: string;
  memberCount: number;
  totalSaved: number;
  outstandingLoans: number;
}

export interface TrendPoint {
  date: string;
  totalSaved: number;
}

export interface GroupAnalytics {
  groups: GroupAnalyticsRow[];
  trend: TrendPoint[];
}

export const fetchGroups = async (): Promise<Group[]> => {
  const res = await axios.get("/groups");
  return res.data;
};

export const createGroup = async (payload: CreateGroupPayload) => {
  const res = await axios.post("/groups", payload);
  return res.data;
};

export const resetLeaderPassword = async (
  groupId: string,
  newPassword: string,
) => {
  const res = await axios.patch(`/groups/${groupId}/reset-leader-password`, {
    newPassword,
  });
  return res.data;
};

export const fetchSystemStats = async (): Promise<SystemStats> => {
  const res = await axios.get("/groups/stats");
  return res.data;
};

export const updateGroupStatus = async (
  groupId: string,
  status: "active" | "suspended" | "inactive",
) => {
  const res = await axios.patch(`/groups/${groupId}/status`, { status });
  return res.data;
};

export const fetchGroupAnalytics = async (): Promise<GroupAnalytics> => {
  const res = await axios.get("/groups/analytics");
  return res.data;
};

export interface ReconciliationConfig {
  id: string;
  knownMobileMoneyBalance: number;
  updatedByUsername: string | null;
  updatedAt: string;
}

export const fetchReconciliationConfig =
  async (): Promise<ReconciliationConfig> => {
    const res = await axios.get("/groups/reconciliation-config");
    return res.data;
  };

export const updateReconciliationConfig = async (
  knownMobileMoneyBalance: number,
) => {
  const res = await axios.patch("/groups/reconciliation-config", {
    knownMobileMoneyBalance,
  });
  return res.data;
};
export interface PlatformFeeGroupBreakdown {
  groupId: string;
  groupName: string;
  totalFees: number;
  feeTransactionCount: number;
}

export interface PlatformFeesSummary {
  totalPlatformFeesCollected: number;
  byGroup: PlatformFeeGroupBreakdown[];
}

export const fetchPlatformFees = async (): Promise<PlatformFeesSummary> => {
  const res = await axios.get("/transactions/platform-fees");
  return {
    totalPlatformFeesCollected: res.data.totalPlatformFeesCollected || 0,
    byGroup: res.data.byGroup || [],
  };
};
