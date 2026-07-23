import { useEffect, useState } from "react";
import { fetchAuditLogs } from "@/api/audit";
import type { AuditLogItem } from "@/types/dashboard";

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    fetchAuditLogs()
      .then((data) => setLogs(data.logs))
      .catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Audit Logs</h2>
      <table className="min-w-full text-sm bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Action</th>
            <th className="p-2 text-left">Severity</th>
            <th className="p-2 text-left">Performed By</th>
            <th className="p-2 text-left">Target Member</th>
            <th className="p-2 text-left">Group</th>
            <th className="p-2 text-left">Details</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i} className="border-t hover:bg-gray-50">
              <td className="p-2">{log.action}</td>
              <td className="p-2">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    log.severity === "critical"
                      ? "bg-red-100 text-red-800"
                      : log.severity === "warning"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                  }`}
                >
                  {log.severity}
                </span>
              </td>
              <td className="p-2">{log.performedBy}</td>
              <td className="p-2">{log.targetMember || "-"}</td>
              <td className="p-2">{log.group || "-"}</td>
              <td className="p-2 text-xs">
                {log.details
                  ? Object.entries(log.details).map(([k, v]) => (
                      <div key={k}>
                        {k}: {v}
                      </div>
                    ))
                  : "-"}
              </td>
              <td className="p-2">{log.status}</td>
              <td className="p-2">
                {new Date(log.date).toLocaleString("en-MW")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
