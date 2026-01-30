import ConnectButton from "./ConnectButton";

export default function Header() {
	return (
		<header className="flex items-center justify-between">
			<h1 className="grow">Consultation dApp</h1>
			<ConnectButton />
		</header>
	);
}
