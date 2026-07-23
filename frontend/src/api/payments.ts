import axios from "./axios";

// DEPRECATED: Loan disbursement is now handled server-side
// via savingsController.approveAndDisburseLoan when a group leader
// approves a pending loan. This endpoint no longer exists.
//
// export const disburseLoan = async (phoneNumber: string, amount: number) => {
//   const res = await axios.post("/payments/disburse", { phoneNumber, amount });
//   return res.data;
// };

// DEPRECATED: Deposits are initiated via USSD by the member.
// Admin-initiated deposits can be added later if needed.
//
// export const depositViaMobileMoney = async (phoneNumber: string, amount: number) => {
//   const res = await axios.post("/payments/deposit", { phoneNumber, amount });
//   return res.data;
// };

// Admin: Approve a pending loan (triggers disbursement)
export const approveLoan = async (transactionId: string) => {
  const res = await axios.patch(`/loans/approve/${transactionId}`);
  return res.data;
};

// Admin: Reject a pending loan
export const rejectLoan = async (transactionId: string, reason: string) => {
  const res = await axios.post("/loans/reject", { transactionId, reason });
  return res.data;
};

// Admin: Request a loan on behalf of a member
export const requestLoanForMember = async (
  phoneNumber: string,
  amount: number,
) => {
  const res = await axios.post("/loans/request", { phoneNumber, amount });
  return res.data;
};
