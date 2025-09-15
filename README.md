# Blipp Dashboard

A comprehensive review management and automation platform built with Vite + React.

## Navigation Structure

The dashboard features a consolidated MVP navigation with six main tabs:

- **Customers** (`/customers`) - Customer management, CSV import, CRM integration
- **Automations** (`/automations`) - Send requests, sequences, social posts, automated workflows  
- **Reviews** (`/reviews`) - Review inbox, performance analytics, tracking
- **Reporting** (`/reporting`) - Main dashboard with KPIs, analytics, insights
- **Settings** (`/settings`) - Integrations, team management, configuration
- **Public Feedback** (`/public-feedback`) - Public-facing features (feature flagged)

## Feature Flags

### PUBLIC_FEEDBACK_ENABLED
Controls visibility of the Public Feedback tab.

**To enable:**
```bash
# Environment variable
VITE_PUBLIC_FEEDBACK_ENABLED=true

# Or runtime (localStorage)
localStorage.setItem('PUBLIC_FEEDBACK_ENABLED', 'true')
```

## Development

### Running the app

```bash
npm install
npm run dev
```

### Building the app

```bash
npm run build
```

### Feature Flag Toggle

In development, use the feature flag toggle in the bottom-right corner to test feature flag functionality.

## Navigation Migration

See [docs/nav-migration.md](docs/nav-migration.md) for complete details on the navigation restructuring and legacy URL redirects.

## Architecture

- **Framework:** Vite + React + React Router
- **UI:** Tailwind CSS + Radix UI components
- **State:** React hooks + context
- **Database:** Supabase
- **Authentication:** Supabase Auth

For more information and support, please contact Base44 support at app@base44.com.