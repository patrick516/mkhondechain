import axios from "./axios";
import type { AuditLogItem } from "@/types/dashboard";

export async function fetchAuditLogs(limit = 50): Promise<AuditLogItem[]> {
  const res = await axios.get(`/audit?limit=${limit}`);
  return res.data;
}
