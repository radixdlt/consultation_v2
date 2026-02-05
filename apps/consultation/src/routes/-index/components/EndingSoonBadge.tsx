import { Clock } from "lucide-react";

type EndingSoonBadgeProps = {
	deadline: Date;
};

export function EndingSoonBadge({ deadline }: EndingSoonBadgeProps) {
	if (!isEndingSoon(deadline)) {
		return null;
	}

	const hoursLeft = Math.ceil(
		(deadline.getTime() - Date.now()) / (1000 * 60 * 60),
	);

	return (
		<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
			<Clock className="size-3" />
			{hoursLeft <= 1 ? "Ending soon" : `${hoursLeft}h left`}
		</span>
	);
}

export function isEndingSoon(deadline: Date): boolean {
	const now = new Date();
	const hoursUntilDeadline =
		(deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
	return hoursUntilDeadline > 0 && hoursUntilDeadline <= 24;
}
