export interface Transaction {
  reference: string;
  date: string;
  type: string;
  amount: number;
  status: string;
  method: string;
  beforeBalance: number;
  afterBalance: number;
  note: string;
}

export interface Summary {
  totalBorrowed: number;
  totalRepaid: number;
  totalOwing: number;
  totalSavings: number;
  totalInterest: number;
  netPosition: number;
}

export interface MemberDetails {
  fullName: string;
  phone: string;
  gender: string;
  balance: number;
  loanBalance: number;
  joined: string;
}
