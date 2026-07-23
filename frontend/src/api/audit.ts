import axios from "./axios";
import type { AuditLogItem } from "@/types/dashboard";

export async function fetchAuditLogs(
  limit = 50,
  page = 1,
): Promise<{
  logs: AuditLogItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const res = await axios.get(`/audit?limit=${limit}&page=${page}`);
  return res.data;
}

export async function fetchAuditStats(): Promise<{
  actionBreakdown: { _id: string; count: number; lastOccurrence: string }[];
  severityBreakdown: { _id: string; count: number }[];
}> {
  const res = await axios.get("/audit/stats");
  return res.data;
}
