import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import type { SortOrder } from "@/atom/temperatureChecksAtom";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type SortToggleProps = {
	sortOrder: SortOrder;
	onSortOrderChange: (sortOrder: SortOrder) => void;
};

export function SortToggle({ sortOrder, onSortOrderChange }: SortToggleProps) {
	return (
		<Select value={sortOrder} onValueChange={onSortOrderChange}>
			<SelectTrigger size="sm" aria-label="Sort order">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="desc">
					<ArrowDownWideNarrow className="size-4" />
					Newest first
				</SelectItem>
				<SelectItem value="asc">
					<ArrowUpNarrowWide className="size-4" />
					Oldest first
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
