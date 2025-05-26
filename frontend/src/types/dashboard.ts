export interface StatItem {
  label: string;
  value: string;
  bg?: string;
  icon?: React.ReactNode;
}

export interface ActivityItem {
  member: string;
  action: string;
  amount: string;
  status: string;
  date: string;
}

export interface LoanRequestItem {
  member: string;

  amount: string;
  date: string;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string;
}

export interface MemberPayload {
  firstName: string;
  surname: string;
  phone: string;
  gender: string;
}

export interface AuditLogItem {
  action: string;
  performedBy: string;
  targetMember: string;
  details: {
    amount: string;
    method: string;
    wallet: string;
  };
  createdAt: string;
}
