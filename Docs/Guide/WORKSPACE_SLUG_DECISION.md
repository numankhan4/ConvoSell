# Workspace Slug Update - Architecture Decision

## Question
Should the workspace slug be updated when the workspace name changes?

## Current Implementation
- **Name**: User-facing display name, can be changed
- **Slug**: URL-safe identifier (e.g., "qeemti-saman"), currently immutable
- **Schema**: Slug is marked `@unique` in database
- **UI**: Shows message "used in URLs and cannot be changed"

## Decision: **KEEP SLUG IMMUTABLE** ✅

### Rationale

#### 1. Database Design
```prisma
model Workspace {
  slug String @unique  // Designed as permanent identifier
}
```
The `@unique` constraint indicates slug is meant to be a stable, permanent identifier.

#### 2. Future-Proofing
Even though slug isn't currently used in routing, the UI message "used in URLs" suggests plans for:
- Public workspace pages: `app.convosell.com/{slug}`
- Shared links: `share.convosell.com/{slug}/report`
- API webhooks: `webhook.com/workspaces/{slug}`

Changing slugs would break all these URLs.

#### 3. Industry Standards

**Examples of slug handling in major SaaS:**

| Platform | Slug/URL | Can Change? | Notes |
|----------|----------|-------------|-------|
| Slack | workspace.slack.com | **No** | Permanent after creation |
| Notion | notion.so/{slug} | **No** | Cannot change workspace URL |
| GitHub | github.com/{username} | Yes* | With warnings, redirects for 90 days |
| Stripe | Customer IDs | **No** | Immutable identifiers |
| Shopify | {shop}.myshopify.com | **No** | Cannot change subdomain |

**Conclusion**: Most platforms keep workspace identifiers immutable.

#### 4. Technical Risks of Changing Slug

If slug changes were allowed, you'd need:

1. **URL Redirects** (Complex)
   ```typescript
   // Store slug history
   model SlugHistory {
     oldSlug   String   @unique
     newSlug   String
     workspaceId String
     changedAt DateTime
   }
   
   // Redirect middleware
   if (oldSlug) {
     return redirect(`/workspace/${newSlug}`);
   }
   ```

2. **Break Detection**
   - Check all existing URLs in emails
   - Update webhooks
   - Update integrations
   - Invalidate caches

3. **Validation**
   - Ensure new slug doesn't conflict
   - Prevent abuse (changing slug to impersonate others)
   - Rate limiting (prevent rapid slug changes)

4. **User Warning**
   ```
   ⚠️ WARNING: Changing your workspace URL will:
   - Break existing bookmarks
   - Invalidate shared links
   - Require updating integrations
   - Take effect immediately
   
   Old URLs will redirect for 90 days only.
   ```

5. **Update All References**
   - Webhook URLs
   - API keys
   - Third-party integrations
   - Email links
   - Shared reports/dashboards

### Recommendation: Keep Current Design

**What we have (GOOD):**
```typescript
// Workspace settings page
<label>Workspace Slug</label>
<input value={slug} disabled />
<p className="text-xs text-gray-500">
  The workspace slug is used in URLs and cannot be changed
</p>
```

**Why this is good:**
- ✅ Clear user expectation (cannot be changed)
- ✅ No risk of breaking links
- ✅ Simpler architecture
- ✅ Better security
- ✅ Follows industry best practices

### Alternative: Display Name vs Identifier

Keep the current two-field approach:

```typescript
// Two separate concepts:
{
  name: "Qeemti Saman Store",        // Display name (changeable)
  slug: "qeemti-saman",               // URL identifier (immutable)
}
```

This is the same pattern as:
- GitHub: Display name vs username
- Twitter: Display name vs handle
- Domain names: Website title vs domain

### What If User Really Needs Slug Change?

If a user has a compelling reason to change slug, offer **one-time slug change** with:
1. Manual approval from support team
2. Setup of URL redirects
3. Email notification to all workspace members
4. 30-day warning period
5. Checklist of things to update

**Implementation:**
```typescript
// Add to Workspace model
lastSlugChangeAt: DateTime?
slugChangeCount: Int @default(0)

// Business rule: Max 1 slug change per year
if (workspace.lastSlugChangeAt > oneYearAgo) {
  throw new Error('Slug can only be changed once per year');
}
```

## What Should Be Updated When Name Changes?

**Update Automatically:**
- ✅ Workspace name (everywhere in the app)
- ✅ Browser title
- ✅ Email subject lines
- ✅ Dashboard headers
- ✅ Zustand auth store

**DO NOT Update:**
- ❌ Workspace slug (permanent identifier)
- ❌ Workspace ID (primary key)
- ❌ Created date
- ❌ Any external service references

## Example: Current Behavior (Perfect!)

```typescript
// User updates name
updateWorkspace({ name: "My New Store Name" })

// What updates:
✅ workspace.name = "My New Store Name"
✅ sidebar shows "My New Store Name"
✅ settings page shows "My New Store Name"
✅ auth store: currentWorkspace.name = "My New Store Name"

// What stays the same:
❌ workspace.slug = "qeemti-saman" (unchanged)
❌ workspace.id = "cmndiib400002phbc5ymhv5fp" (unchanged)
```

This is exactly what users expect!

## Summary

**Current Implementation: PERFECT ✅**

Your current design is already correct:
1. Name is editable (user-facing, display only)
2. Slug is immutable (identifier, potential URLs)
3. UI clearly states slug cannot be changed
4. Database enforces uniqueness with `@unique`

**No changes needed to the slug behavior.**

## If You Want to Add Value

Instead of updating slug, consider:
1. **Custom domains**: `mystore.com` instead of `app.convosell.com/qeemti-saman`
2. **Workspace avatar/logo**: More visible than slug
3. **Workspace description**: Additional metadata
4. **Branded emails**: From "My Store Name <noreply@convosell.com>"

These provide customization without the risks of changing slugs.

---

## Final Answer

**Keep slug immutable.** Your current implementation is correct and follows SaaS best practices. The name update you just fixed is all that's needed!
