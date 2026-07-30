import axios from "@/api/axios";

export interface CycleStatus {
  cycleActive: boolean;
  cycleStartDate: string | null;
  cycleEndDate: string | null;
  daysRemaining: number | null;
}
export interface ShareoutMemberResult {
  memberId: string;
  firstName: string;
  surname: string;
  phone: string;
  totalSaved: number;
  owedIncludingInterest: number;
  entitledShare: number;
  loanOffset: number;
  cashPayout: number;
  remainingLoanBalance: number;
}

export interface ShareoutPreview {
  groupId: string;
  totalGroupSavings: number;
  totalOutstandingLoans: number;
  totalPotValue: number;
  totalCashPayout: number;
  members: ShareoutMemberResult[];
}

export const fetchCycleStatus = async (): Promise<CycleStatus> => {
  const res = await axios.get("/cycle");
  return res.data;
};

export const startCycle = async (
  cycleStartDate: string,
  cycleEndDate: string,
) => {
  const res = await axios.post("/cycle/start", {
    cycleStartDate,
    cycleEndDate,
  });
  return res.data;
};

export const fetchShareoutPreview = async (): Promise<ShareoutPreview> => {
  const res = await axios.get("/cycle/shareout-preview");
  return res.data;
};

export const closeCycle = async () => {
  const res = await axios.post("/cycle/close");
  return res.data;
};
