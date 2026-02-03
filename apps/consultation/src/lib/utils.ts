import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function truncateAddress(address: string): string {
	if (address.length <= 16) return address;
	return `${address.slice(0, 12)}...${address.slice(-4)}`;
}
