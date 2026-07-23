import { useState } from "react";
import axios from "@/api/axios";
import toast from "react-hot-toast";

export default function AddMember() {
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [pin, setPin] = useState("");
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(false);

  const formatPhoneNumber = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.startsWith("0")) {
      return "+265" + trimmed.substring(1);
    }
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pin || pin.length < 4 || pin.length > 6) {
      toast.error("PIN must be 4-6 digits");
      return;
    }

    if (!groupId) {
      toast.error("Please enter a group ID");
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);

      const res = await axios.post("/members", {
        firstName: firstName.trim(),
        surname: surname.trim(),
        phone: formattedPhone,
        gender,
        pin,
        groupId,
      });

      toast.success(
        `Member ${res.data.firstName} ${res.data.surname} added successfully!`,
      );
      setFirstName("");
      setSurname("");
      setPhone("");
      setGender("");
      setPin("");
      setGroupId("");
    } catch (error: any) {
      const message = error?.response?.data?.error || "Failed to add member";
      toast.error(message);
      console.error("Error adding member:", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-start justify-center min-h-screen pt-10 bg-gray-100">
      <div>
        <h1 className="mb-6 text-2xl font-bold text-center">Add Member</h1>
        <form
          onSubmit={handleSubmit}
          className="w-[400px] p-6 space-y-4 bg-white rounded shadow"
        >
          <div>
            <label className="block mb-1 text-sm font-medium">First Name</label>
            <input
              className="w-full p-2 border rounded"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Surname</label>
            <input
              className="w-full p-2 border rounded"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Gender</label>
            <select
              className="w-full p-2 border rounded"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
            >
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Phone Number
            </label>
            <input
              className="w-full p-2 border rounded"
              placeholder="0999123456 or +265999123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              USSD PIN (4-6 digits)
            </label>
            <input
              type="password"
              maxLength={6}
              className="w-full p-2 border rounded"
              placeholder="e.g. 1234"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Member will use this PIN to authenticate USSD transactions
            </p>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Group ID</label>
            <input
              className="w-full p-2 border rounded"
              placeholder="Paste group ID from admin dashboard"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Ask your superadmin for the group ID
            </p>
          </div>

          <button
            className="w-full px-4 py-2 text-white rounded bg-primary hover:opacity-90 disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Member"}
          </button>
        </form>
      </div>
    </div>
  );
}
