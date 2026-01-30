import AccountSelector from "./AccountSelector";
import ConnectButton from "./ConnectButton";

export default function Header() {
	return (
		<header className="flex items-center justify-between">
			<h1 className="grow">Consultation dApp</h1>
			<div className="flex items-center gap-2">
				<AccountSelector />
				<ConnectButton />
			</div>
		</header>
	);
}
