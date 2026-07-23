export interface MemberSummary {
  _id: string;
  firstName: string;
  surname: string;
  phone: string;
  balance: number;
  loanBalance: number;
  totalSaved: number;
  totalBorrowed: number;
  totalRepaid: number;
  totalInterest: number;
  netPosition: number;
}
