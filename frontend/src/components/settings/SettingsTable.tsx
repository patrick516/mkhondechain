interface SettingsTableProps {
  repayDays: number;
  interestRate: number;
  minSaveAmount: number;
  maxLoanPercent: number;
  onEdit: () => void;
}

export default function SettingsTable({
  repayDays,
  interestRate,
  minSaveAmount,
  maxLoanPercent,
  onEdit,
}: SettingsTableProps) {
  const rows = [
    { label: "Loan Repayment Period", value: `${repayDays} days` },
    { label: "Interest Rate", value: `${interestRate}%` },
    {
      label: "Minimum Save Amount",
      value: `MK ${minSaveAmount.toLocaleString()}`,
    },
    { label: "Max Loan (% of savings)", value: `${maxLoanPercent}%` },
  ];

  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Loan Settings</h2>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition"
        >
          Edit Settings
        </button>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className="border-b border-gray-50 last:border-0"
            >
              <td className="px-6 py-4 text-gray-500">{row.label}</td>
              <td className="px-6 py-4 font-semibold text-gray-800">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
