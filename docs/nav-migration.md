# Navigation Migration Guide

## Overview

This document outlines the migration from the previous navigation structure to the new consolidated MVP navigation with six main tabs.

## New Navigation Structure

The dashboard now has six main tabs:

1. **Customers** - Customer management and data
2. **Automations** - All automation and outreach features  
3. **Reviews** - Review management and performance
4. **Reporting** - Analytics, KPIs, and insights (main dashboard)
5. **Settings** - Configuration and administration
6. **Public Feedback** - Public-facing features (feature flagged)

## URL Migration Table

### Legacy → New URL Mappings

| Legacy URL | New URL | Notes |
|------------|---------|-------|
| `/dashboard` | `/reporting` | Main dashboard is now reporting |
| `/home` | `/reporting` | Home redirects to reporting |
| `/overview` | `/reporting` | Overview redirects to reporting |
| `/clients` | `/customers` | Renamed for clarity |
| `/csv-import` | `/customers/import` | Moved under customers |
| `/send-requests` | `/automations/send-requests` | Moved under automations |
| `/automated-requests` | `/automations/automated-requests` | Moved under automations |
| `/sequences` | `/automations/sequences` | Moved under automations |
| `/social-posts` | `/automations/social-posts` | Moved under automations |
| `/review-inbox` | `/reviews/inbox` | Moved under reviews |
| `/review-performance` | `/reviews/performance` | Moved under reviews |
| `/review-tracking` | `/reviews/tracking` | Moved under reviews |
| `/revenue-impact` | `/reporting/revenue-impact` | Moved under reporting |
| `/competitors` | `/reporting/competitors` | Moved under reporting |
| `/conversations` | `/reporting/conversations` | Moved under reporting |
| `/reports` | `/reporting` | Consolidated reporting |
| `/analytics` | `/reporting` | Consolidated reporting |
| `/insights` | `/reporting` | Consolidated reporting |
| `/kpis` | `/reporting` | Consolidated reporting |
| `/nps` | `/reporting` | Consolidated reporting |
| `/keywords` | `/reporting` | Consolidated reporting |
| `/trends` | `/reporting` | Consolidated reporting |
| `/reply-rate` | `/reporting` | Consolidated reporting |
| `/response-time` | `/reporting` | Consolidated reporting |
| `/social-metrics` | `/reporting/social-metrics` | Moved under reporting |
| `/integrations` | `/settings/integrations` | Moved under settings |
| `/team-roles` | `/settings/team-roles` | Moved under settings |
| `/audit-log` | `/settings/audit-log` | Moved under settings |
| `/notifications` | `/settings/notifications` | Moved under settings |
| `/billing` | `/settings/billing` | Moved under settings |
| `/branding` | `/settings/branding` | Moved under settings |
| `/templates` | `/settings/templates` | Moved under settings |
| `/domains` | `/settings/domains` | Moved under settings |
| `/auth` | `/settings/auth` | Moved under settings |
| `/api-keys` | `/settings/api-keys` | Moved under settings |
| `/webhooks` | `/settings/webhooks` | Moved under settings |
| `/private-feedback` | `/public-feedback` | Renamed and feature flagged |
| `/public-page` | `/public-feedback` | Consolidated under public feedback |
| `/embed` | `/public-feedback` | Consolidated under public feedback |
| `/widget` | `/public-feedback` | Consolidated under public feedback |
| `/public-feedback-form` | `/public-feedback` | Consolidated under public feedback |
| `/review-widget` | `/public-feedback` | Consolidated under public feedback |
| `/landing-badge` | `/public-feedback` | Consolidated under public feedback |

## Feature Flags

### PUBLIC_FEEDBACK_ENABLED

The Public Feedback tab is controlled by the `PUBLIC_FEEDBACK_ENABLED` feature flag.

**Default:** `false` (disabled)

**To enable:**
1. Set environment variable: `VITE_PUBLIC_FEEDBACK_ENABLED=true`
2. Or enable at runtime: `localStorage.setItem('PUBLIC_FEEDBACK_ENABLED', 'true')`
3. Or use the development feature flag toggle (dev builds only)

**Behavior:**
- When disabled: Public Feedback tab is hidden from navigation
- When enabled: Public Feedback tab appears in navigation
- Route protection: `/public-feedback` returns 404 when flag is disabled

## Navigation Structure Details

### Customers Tab (`/customers`)
- Customer management and profiles
- CSV import functionality
- CRM/Zapier integration management
- Customer deduplication tools

### Automations Tab (`/automations`)
- Send Requests (`/automations/send-requests`)
- Automated Requests (`/automations/automated-requests`)
- Sequences (`/automations/sequences`)
- Social Posts (`/automations/social-posts`)

### Reviews Tab (`/reviews`)
- Main Reviews page (`/reviews`)
- Review Inbox (`/reviews/inbox`)
- Performance Analytics (`/reviews/performance`)
- Review Tracking (`/reviews/tracking`)

### Reporting Tab (`/reporting`)
- Main dashboard with KPIs
- Revenue Impact (`/reporting/revenue-impact`)
- Competitor Analysis (`/reporting/competitors`)
- Conversations (`/reporting/conversations`)
- All analytics and insights consolidated here

### Settings Tab (`/settings`)
- Main Settings page (`/settings`)
- Integrations (`/settings/integrations`)
- Team & Roles (`/settings/team-roles`)
- Audit Log (`/settings/audit-log`)
- Notifications (`/settings/notifications`)
- Billing, Branding, Templates, etc. (to be implemented)

### Public Feedback Tab (`/public-feedback`)
- Public-facing feedback collection
- Embeddable widgets
- Public review forms
- Landing page badges
- **Feature Flagged:** Only visible when `PUBLIC_FEEDBACK_ENABLED=true`

## Redirect Behavior

All legacy URLs automatically redirect to their new locations using React Router's `Navigate` component with `replace={true}`. This ensures:

1. **SEO-friendly:** URLs are replaced in browser history
2. **Query parameters preserved:** Any query parameters are maintained during redirect
3. **Immediate redirect:** No flash of old content

## Implementation Notes

### Code Changes

1. **Centralized Navigation Config** (`src/config/nav.ts`)
   - Single source of truth for navigation structure
   - Feature flag integration
   - Legacy URL mapping

2. **Feature Flag System** (`src/lib/featureFlags.ts`)
   - Runtime and build-time flag support
   - Event-driven updates
   - Development toggle component

3. **Updated Routing** (`src/pages/index.jsx`)
   - New consolidated route structure
   - Automatic legacy redirects
   - Feature flag route protection

4. **Updated Sidebar** (`src/components/dashboard/ModernSidebar.jsx`)
   - Uses centralized navigation config
   - Feature flag filtering
   - Dynamic icon mapping

### Testing

1. **Manual Testing Checklist:**
   - [ ] All six tabs load without 404s
   - [ ] Legacy URLs redirect correctly
   - [ ] Breadcrumbs reflect new structure
   - [ ] Feature flags work correctly
   - [ ] Navigation highlights active sections
   - [ ] Mobile navigation works
   - [ ] Keyboard navigation works

2. **Automated Testing:**
   - Route redirect tests
   - Feature flag tests
   - Navigation component tests

## Rollback Plan

If rollback is needed:

1. Revert `src/pages/index.jsx` to previous route structure
2. Revert `src/components/dashboard/ModernSidebar.jsx` to previous navigation
3. Remove feature flag system if not needed
4. Update any hardcoded navigation references

## Future Enhancements

1. **Settings Subsections:** Implement left-rail navigation for settings subsections
2. **Reporting KPIs:** Add prominent KPI display at top of reporting page
3. **Breadcrumb System:** Implement dynamic breadcrumbs based on current route
4. **Role-based Navigation:** Hide/show navigation items based on user roles
5. **Analytics Integration:** Track navigation usage for future optimization

## Support

For questions or issues with the navigation migration:

1. Check this documentation first
2. Review the centralized navigation config
3. Test with feature flags in development
4. Check browser console for routing errors
