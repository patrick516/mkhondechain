import axios from "./axios";

export const disburseLoan = async (phoneNumber: string, amount: number) => {
  const res = await axios.post("/payments/disburse", {
    phoneNumber,
    amount,
  });
  return res.data;
};

export const depositViaMobileMoney = async (
  phoneNumber: string,
  amount: number
) => {
  const res = await axios.post("/payments/deposit", {
    phoneNumber,
    amount,
  });
  return res.data;
};
