import { Link } from "@tanstack/react-router";
import { Calendar, User } from "lucide-react";
import { AddressLink } from "@/components/AddressLink";
import { Card } from "@/components/ui/card";
import { EndingSoonBadge } from "./EndingSoonBadge";
import { QuorumProgress } from "./QuorumProgress";
import { type ItemStatus, StatusBadge, getItemStatus } from "./StatusBadge";

type ItemCardProps = {
	id: number;
	title: string;
	shortDescription: string;
	author: string;
	start: Date;
	deadline: Date;
	voteCount: number;
	quorum: string;
	linkPrefix: "/tc" | "/proposal";
};

export function ItemCard({
	id,
	title,
	shortDescription,
	author,
	start,
	deadline,
	voteCount,
	quorum,
	linkPrefix,
}: ItemCardProps) {
	const status: ItemStatus = getItemStatus(deadline);
	const isActive = status === "active";

	return (
		<Link to={`${linkPrefix}/$id`} params={{ id: String(id) }}>
			<Card className="group cursor-pointer transition-shadow hover:shadow-md">
				<div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
					{/* Left side - Main content */}
					<div className="flex min-w-0 flex-1 flex-col gap-3">
						{/* Header with ID and badges */}
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-sm font-medium text-muted-foreground">
								#{id}
							</span>
							<StatusBadge status={status} />
							{isActive && <EndingSoonBadge deadline={deadline} />}
						</div>

						{/* Title */}
						<h3 className="line-clamp-2 text-lg font-semibold text-foreground group-hover:text-primary">
							{title}
						</h3>

						{/* Short description */}
						<p className="line-clamp-2 text-sm text-muted-foreground">
							{shortDescription}
						</p>

						{/* Metadata */}
						<div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
							<div className="flex items-center gap-1">
								<User className="size-3" />
								<AddressLink address={author} />
							</div>
							<div className="flex items-center gap-1">
								<Calendar className="size-3" />
								<span>
									{formatDateRange(start, deadline)}
								</span>
							</div>
						</div>
					</div>

					{/* Right side - Quorum progress */}
					<div className="flex-shrink-0 sm:ml-4">
						<QuorumProgress voteCount={voteCount} quorum={quorum} />
					</div>
				</div>
			</Card>
		</Link>
	);
}

function formatDateRange(start: Date, deadline: Date): string {
	const dateOptions: Intl.DateTimeFormatOptions = {
		month: "short",
		day: "numeric",
	};

	const timeOptions: Intl.DateTimeFormatOptions = {
		hour: "numeric",
		minute: "2-digit",
	};

	const startDate = start.toLocaleDateString("en-US", dateOptions);
	const startTime = start.toLocaleTimeString("en-US", timeOptions);

	const deadlineDate = deadline.toLocaleDateString("en-US", {
		...dateOptions,
		year:
			start.getFullYear() !== deadline.getFullYear() ? "numeric" : undefined,
	});
	const deadlineTime = deadline.toLocaleTimeString("en-US", timeOptions);

	return `${startDate} ${startTime} - ${deadlineDate} ${deadlineTime}`;
}
