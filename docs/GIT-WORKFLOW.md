# Git Workflow

## Version Iteration

Use semantic versions:

- Major: large user-facing or data-format changes, e.g. `3.0.0`.
- Minor: new features that do not break existing data, e.g. `3.1.0`.
- Patch: bug fixes, copy fixes, small UI fixes, e.g. `3.0.1`.

The app version is stored in:

- `package.json`
- `src/lib/constants.ts`

Both must be updated together.

## Push Summary Format

Every push summary should be short and grouped like this:

```markdown
## Push Summary

### New
- ...

### Changed
- ...

### Fixed
- ...

### Security
- ...

### Verify
- `npm run build`
- `npm audit --audit-level=moderate`
```

Only include sections that matter. If there is no security change, omit `Security`.

## Before Push Checklist

1. Run `npm run build`.
2. Run `npm audit --audit-level=moderate`.
3. Update `CHANGELOG.md` if the push contains user-visible changes.
4. Mention the commit hash after push.
5. Tell the user whether Cloudflare needs redeploying or Supabase SQL needs rerunning.

## Example

```markdown
## Push Summary

### New
- Added V3 language selector.
- Added custom Excel upload card.

### Changed
- README is now a user guide.

### Fixed
- Exported OPCG Excel files now import through full restore instead of manual mapping.

### Verify
- `npm run build` passed.
- `npm audit --audit-level=moderate` found 0 vulnerabilities.
```
