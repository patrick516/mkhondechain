// File: frontend/src/api/disputes.ts

import axios from "@/api/axios";

export interface DisputeItem {
  id: string;
  member: string;
  phone: string;
  source: "USSD" | "Admin";
  description: string;
  status: "open" | "investigating" | "resolved" | "rejected";
  transactionReference: string | null;
  transactionType: string | null;
  transactionAmount: number | null;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export const fetchDisputes = async (): Promise<DisputeItem[]> => {
  const res = await axios.get("/disputes");
  return res.data;
};

export const resolveDispute = async (
  disputeId: string,
  status: "resolved" | "rejected" | "investigating",
  resolutionNote?: string,
) => {
  const res = await axios.patch(`/disputes/${disputeId}/resolve`, {
    status,
    resolutionNote,
  });
  return res.data;
};
