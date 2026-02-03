import { cn } from "@/lib/utils";

export type ItemStatus = "active" | "closed" | "passed";

type StatusBadgeProps = {
	status: ItemStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
				status === "active" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
				status === "closed" && "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
				status === "passed" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
			)}
		>
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</span>
	);
}

export function getItemStatus(deadline: Date): ItemStatus {
	const now = new Date();
	// Active if deadline hasn't passed yet
	if (deadline > now) {
		return "active";
	}
	// TODO: Check if quorum was met to determine "passed" vs "closed"
	// For now, all expired items are marked as "closed" until vote result data is available
	return "closed";
}
