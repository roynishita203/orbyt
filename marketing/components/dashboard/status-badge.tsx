import { SubStatus, subStatusLabel, type SubStatusValue } from "@/lib/subVaultTypes"

const STYLES: Record<SubStatusValue, string> = {
  [SubStatus.Active]: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  [SubStatus.PastDue]: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  [SubStatus.Cancelled]: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

export function StatusBadge({ status }: { status: SubStatusValue }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STYLES[status]}`}>
      {subStatusLabel(status)}
    </span>
  )
}
