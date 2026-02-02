# Your Votes Display

Display accounts that user has voted with on the temperature check details page.

## Decisions

- **Location:** Separate card below voting section in sidebar
- **Content:** Account label + truncated address + colored vote badge
- **Empty state:** Hidden when no votes to display
- **Position:** Immediately after VotingSection, before metadata

## Component Structure

New `YourVotesSection` component renders a card:

```
┌─────────────────────────────┐
│ Your Votes                  │
├─────────────────────────────┤
│ Main Account           [For]│
│ account_tdx...3f9a          │
├─────────────────────────────┤
│ Savings            [Against]│
│ account_tdx...8b2c          │
└─────────────────────────────┘
```

## Data Flow

1. `accountsVotes` already fetched via `getTemperatureCheckVotesByAccountsAtom`
2. Join with `accounts` from `accountsAtom` to get labels
3. Pass joined data to `YourVotesSection`

```typescript
type VotedAccount = {
  address: string
  label: string
  vote: "For" | "Against"
}
```

## Visual Styling

- "For" badge: `bg-emerald-100 text-emerald-700`
- "Against" badge: `bg-rose-100 text-rose-700`
- Account label: `font-medium`
- Address: `text-muted-foreground text-xs`
- Truncation: first 12 chars + "..." + last 4 chars

## Files to Modify

1. `apps/consultation/src/routes/tc/$id/-$id/components/SidebarContent.tsx`
   - Add `YourVotesSection` component
   - Join `accountsVotes` with accounts data
   - Render section conditionally

## Implementation Steps

1. Add `truncateAddress` helper function
2. Create `YourVotesSection` component with Card layout
3. Join vote data with account labels in `SidebarContent`
4. Render `YourVotesSection` below `VotingSection` when votes exist
