import { useEffect, useState } from "react";
import { fetchAuditLogs } from "@/api/audit";
import type { AuditLogItem } from "@/types/dashboard";

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    fetchAuditLogs().then(setLogs).catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Audit Logs</h2>
      <table className="min-w-full text-sm bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Action</th>
            <th className="p-2 text-left">Performed By</th>
            <th className="p-2 text-left">Target</th>
            <th className="p-2 text-left">Amount</th>
            <th className="p-2 text-left">Method</th>
            <th className="p-2 text-left">Wallet</th>
            <th className="p-2 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i} className="border-t hover:bg-gray-50">
              <td className="p-2">{log.action}</td>
              <td className="p-2">{log.performedBy}</td>
              <td className="p-2">{log.targetMember}</td>
              <td className="p-2">{log.details.amount}</td>
              <td className="p-2">{log.details.method}</td>
              <td className="p-2 truncate">{log.details.wallet}</td>
              <td className="p-2">
                {new Date(log.createdAt).toLocaleString("en-MW")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
