export interface MemberSummary {
  _id: string;
  firstName: string;
  surname: string;
  borrowed: number;
  repaid: number;
  paidStatus: "Yes" | "No" | "Partial";
  debtor: number;
  interest: number;
  totalAmount: number;
}
