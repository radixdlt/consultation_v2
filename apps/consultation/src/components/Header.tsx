import { Link } from '@tanstack/react-router'
import { Menu, Moon, Sun } from 'lucide-react'
import AccountSelector from './AccountSelector'
import ConnectButton from './ConnectButton'
import { useTheme } from './providers/themeProvider'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu'

export default function Header() {
  const { actualTheme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {/* Mobile hamburger */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                aria-label="Menu"
              >
                <Menu className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link to="/">Home</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/tc/new">New Proposal</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center bg-foreground text-background text-sm font-semibold">
              R
            </div>
            <span className="hidden sm:inline text-base font-medium tracking-tight">
              Consultation
              <span className="ml-1 text-xs font-light text-muted-foreground">
                v2
              </span>
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" activeOptions={{ exact: true }}>Home</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tc/new">New Proposal</Link>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() =>
              setTheme(actualTheme === 'dark' ? 'light' : 'dark')
            }
            aria-label="Toggle theme"
          >
            {actualTheme === 'dark' ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>

          <AccountSelector />
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}
