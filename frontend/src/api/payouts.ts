import axios from "@/api/axios";

export interface PayoutRecord {
  id: string;
  firstName: string;
  surname: string;
  phone: string;
  cycleStartDate: string;
  cycleEndDate: string;
  entitledShare: number;
  loanOffset: number;
  cashPayout: number;
  remainingLoanBalance: number;
  note: string | null;
  createdAt: string;
}

export const fetchPayoutHistory = async (): Promise<PayoutRecord[]> => {
  const res = await axios.get("/payouts");
  return res.data;
};

export const downloadPayoutsPdf = async () => {
  const res = await axios.get("/payouts/export/pdf", { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "payout_history.pdf");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
