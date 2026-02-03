import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaginationProps = {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
};

export function Pagination({
	currentPage,
	totalPages,
	onPageChange,
}: PaginationProps) {
	if (totalPages <= 1) {
		return null;
	}

	return (
		<div className="flex items-center justify-center gap-2">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => onPageChange(currentPage - 1)}
				disabled={currentPage <= 1}
			>
				<ChevronLeft className="size-4" />
				<span className="sr-only">Previous page</span>
			</Button>

			<div className="flex items-center gap-1">
				{getPageNumbers(currentPage, totalPages).map((page, index) => {
					if (page === "...") {
						return (
							<span
								key={`ellipsis-${index}`}
								className="px-2 text-muted-foreground"
							>
								...
							</span>
						);
					}

					return (
						<Button
							key={page}
							type="button"
							variant={page === currentPage ? "default" : "outline"}
							size="sm"
							onClick={() => onPageChange(page)}
							className="min-w-9"
						>
							{page}
						</Button>
					);
				})}
			</div>

			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage >= totalPages}
			>
				<ChevronRight className="size-4" />
				<span className="sr-only">Next page</span>
			</Button>
		</div>
	);
}

function getPageNumbers(
	currentPage: number,
	totalPages: number,
): (number | "...")[] {
	const pages: (number | "...")[] = [];

	if (totalPages <= 7) {
		for (let i = 1; i <= totalPages; i++) {
			pages.push(i);
		}
		return pages;
	}

	// Always show first page
	pages.push(1);

	if (currentPage > 3) {
		pages.push("...");
	}

	// Show pages around current
	const start = Math.max(2, currentPage - 1);
	const end = Math.min(totalPages - 1, currentPage + 1);

	for (let i = start; i <= end; i++) {
		pages.push(i);
	}

	if (currentPage < totalPages - 2) {
		pages.push("...");
	}

	// Always show last page
	pages.push(totalPages);

	return pages;
}
