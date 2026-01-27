# Snapshot References

Element references (`@e1`, `@e2`, etc.) returned by `agent-browser snapshot -i` are the primary way to interact with page elements.

## Ref Lifecycle

- Refs are valid until the page navigates or significant DOM changes occur
- After navigation, run `snapshot -i` again to get fresh refs
- Refs become invalid when elements are removed or repositioned

## Best Practices

1. **Re-snapshot after navigation**: Always get new refs after page changes
2. **Use -i flag**: Get interactive elements only for cleaner output
3. **Reference stability**: Refs are stable within a page load but not across navigations

## Troubleshooting

**Ref not found**: Element may have moved or been removed. Run `snapshot -i` again.

**Wrong element**: Page structure may have changed. Get fresh snapshot.
