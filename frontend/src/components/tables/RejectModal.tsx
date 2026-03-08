import React, { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function RejectModal({ isOpen, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded shadow-lg">
        <h2 className="mb-2 text-lg font-bold">Reject Loan Request</h2>
        <textarea
          placeholder="Enter reason..."
          className="w-full p-2 mb-4 border rounded"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 bg-gray-300 rounded">
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(reason);
              setReason("");
            }}
            className="px-3 py-1 text-white bg-red-500 rounded"
            disabled={!reason.trim()}
          >
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
}
