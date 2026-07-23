import { useState } from "react";
import toast from "react-hot-toast";

export default function AddDeposit() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");

  const formatPhone = (input: string) => {
    const trimmed = input.trim();
    return trimmed.startsWith("0") ? `+265${trimmed.slice(1)}` : trimmed;
  };

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedPhone = formatPhone(phoneNumber);
    const numericAmount = Number(amount);

    if (!formattedPhone || !numericAmount) {
      toast.error("Please enter valid phone number and amount");
      return;
    }

    // Show USSD instructions instead of processing
    toast.success(
      `USSD simulation: Member dials *XXX#, selects Save, enters MK ${numericAmount.toLocaleString()}`,
    );

    setPhoneNumber("");
    setAmount("");
  };

  return (
    <div className="max-w-md p-6 mx-auto mt-10 space-y-6">
      {/* Info Card */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <h3 className="text-blue-800 font-semibold mb-2">
          ℹ️ How Deposits Work
        </h3>
        <p className="text-sm text-blue-700">
          Members deposit money directly through USSD on their phone. They dial{" "}
          <strong>*XXX#</strong>, select <strong>Save</strong>, enter their PIN,
          and confirm the amount. The money is deducted from their Airtel Money
          or TNM Mpamba wallet.
        </p>
      </div>

      {/* USSD Simulation Form */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="mb-4 text-xl font-semibold text-center text-primary">
          Simulate USSD Deposit
        </h2>
        <p className="text-sm text-gray-500 mb-4 text-center">
          For testing only. In production, members use their phone.
        </p>

        <form onSubmit={handleSimulate} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">
              Phone Number
            </label>
            <input
              className="w-full p-2 border rounded"
              placeholder="e.g. 0999123456"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">
              Amount (MWK)
            </label>
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
            className="w-full px-4 py-2 text-white rounded bg-primary hover:opacity-90"
          >
            Simulate USSD Deposit
          </button>
        </form>
      </div>
    </div>
  );
}
