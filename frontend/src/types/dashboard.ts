import type { ReactNode } from "react";

export interface StatItem {
  label: string;
  value: string;
  bg?: string;
  icon?: ReactNode;
}

export interface ActivityItem {
  member: string;
  action: string;
  amount: string;
  status: string;
  date: string;
}

export interface LoanRequestItem {
  transactionId: string;
  reference: string;
  member: string;
  phone?: string;
  amount: number;
  date: string;
  status: "pending" | "success" | "failed" | "reversed";
}

export interface MemberPayload {
  firstName: string;
  surname: string;
  phone: string;
  gender: string;
  pin: string;
  groupId: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  severity: "info" | "warning" | "critical";
  performedBy: string;
  targetMember?: string;
  group?: string;
  details: Record<string, string>;
  status: "success" | "failed";
  date: string;
}
