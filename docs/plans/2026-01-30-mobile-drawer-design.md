# Mobile Drawer for TC Detail Page

## Summary

Move the right column (title, voting, metadata) into a bottom drawer on mobile. Desktop layout unchanged.

## Trigger

- Floating action button (FAB) in bottom-right corner
- Icon only (Vote icon from lucide)
- Visible only on mobile (`lg:hidden`)

## Components

### New Files

1. `components/ui/drawer.tsx` - Vaul-based drawer (shadcn pattern)
2. `routes/tc/$id/-$id/components/SidebarContent.tsx` - Extracted sidebar content

### Modified Files

1. `routes/tc/$id/-$id/index.tsx` - Add responsive drawer/FAB logic

## Dependencies

- `vaul` - Drawer foundation library

## Layout Logic

```
Desktop (lg+):
┌─────────────────────┬────────┐
│                     │ Title  │
│    Markdown         │ Vote   │
│    Content          │ Meta   │
│                     │(sticky)│
└─────────────────────┴────────┘

Mobile (<lg):
┌─────────────────────────────┐
│       Markdown Content      │
│                             │
│                             │
│                        [FAB]│ ← Vote icon, opens drawer
└─────────────────────────────┘
         ↓ tap FAB
┌─────────────────────────────┐
│ ════════ (drag handle) ════ │
│ Title                       │
│ VotingSection               │
│ Metadata                    │
└─────────────────────────────┘
```

## FAB Specs

- Position: `fixed bottom-6 right-6`
- Size: 56px, `rounded-full`
- Icon: `Vote` (lucide-react)
- Shadow for elevation

## Drawer Specs

- Direction: bottom
- Height: auto, max ~80vh
- Scrollable content
- Standard drag handle
