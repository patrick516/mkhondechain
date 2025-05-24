import { useState } from "react";
import toast from "react-hot-toast";
import { depositViaMobileMoney } from "@/api/payments";

export default function AddDeposit() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");

  const formatPhone = (input: string) => {
    const trimmed = input.trim();
    return trimmed.startsWith("0") ? `+265${trimmed.slice(1)}` : trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formattedPhone = formatPhone(phoneNumber);
      const numericAmount = Number(amount);

      if (!formattedPhone || !numericAmount) {
        toast.error("Please enter valid phone number and amount");
        return;
      }

      await depositViaMobileMoney(formattedPhone, numericAmount);
      toast.success(`Deposit of MK ${numericAmount.toLocaleString()} sent`);

      setPhoneNumber("");
      setAmount("");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Deposit failed. Please try again."
      );
      console.error("Deposit error:", err);
    }
  };

  return (
    <div className="max-w-md p-6 mx-auto mt-10 bg-white rounded shadow">
      <h2 className="mb-4 text-xl font-semibold text-center text-primary">
        Deposit to Member
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 text-sm font-medium">Phone Number</label>
          <input
            className="w-full p-2 border rounded"
            placeholder="e.g. 0999123456"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium">Amount (MWK)</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 text-white rounded bg-primary"
        >
          Submit Deposit
        </button>
      </form>
    </div>
  );
}
