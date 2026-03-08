import { useState } from "react";
import axios from "@/api/axios";
import toast from "react-hot-toast";

export default function AddMember() {
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [ethAddress, setEthAddress] = useState("");

  const formatPhoneNumber = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.startsWith("0")) {
      return "+265" + trimmed.substring(1);
    }
    return trimmed; // assume already valid
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formattedPhone = formatPhoneNumber(phone);

      const res = await axios.post("/members", {
        firstName,
        surname,
        phone: formattedPhone,
        gender,
        ethAddress,
      });

      console.log("Member created:", res.data);
      toast.success("Member added successfully!");
      setFirstName("");
      setSurname("");
      setPhone("");
      setGender("");
      setEthAddress("");
    } catch (error: any) {
      console.error("Error adding member:", error.message);
      toast.error("Failed to add member");
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
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Phone Number
            </label>
            <input
              className="w-full p-2 border rounded"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Wallet Address (optional)
            </label>
            <input
              className="w-full p-2 border rounded"
              value={ethAddress}
              onChange={(e) => setEthAddress(e.target.value)}
            />
          </div>

          <button
            className="px-4 py-2 text-white rounded bg-primary"
            type="submit"
          >
            Save Member
          </button>
        </form>
      </div>
    </div>
  );
}
