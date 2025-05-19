export interface Transaction {
  date: string;
  type: string;
  amount: number;
  repaid: number;
  method: string;
  note: string;
  interest: number;
  totalOnDay: number;
}

export interface Summary {
  totalBorrowed: number;
  totalRepaid: number;
  totalOwing: number;
  totalSavings: number;
  totalInterest: number;
  totalWithInterest: number;
  conclusion: string;
}

export interface MemberDetails {
  fullName: string;
  phone: string;
  gender: string;
  ethAddress: string;
  joined: string;
}
