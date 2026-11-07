# CareConnect Ethiopia — Part 15 Architectural Assessment
## Frontend Shared Architecture, Design System, Reusable Components and Portal Layout Foundations

**Author:** CareConnect Ethiopia Frontend Architecture Team  
**Date:** 2026-11-07  
**Status:** Approved for Implementation  
**Scope:** Part 15 of 50 (Commits 113–120)

---

### 1. Executive Summary & Existing State Assessment

CareConnect Ethiopia features a multi-tiered healthcare workflow serving four distinct operational roles:
1. **Health Centre Staff**: Primary clinic clinicians authoring referrals, recording initial patient triage, and uploading paper clinical notes.
2. **Hospital Triage Clinicians**: Regional and tertiary referral hospital specialists reviewing incoming queue referrals, accepting/rejecting cases, allocating beds, and requesting lab data.
3. **Emergency Transport Dispatchers**: Ambulance fleet operators coordinating emergency transfers, tracking vehicle transit, and handling road delays.
4. **System Administrators & Regional Health Officers**: System supervisors managing facilities, users, RBAC permissions, service capacities, AI models, and platform audit logs.

#### Architectural Findings from Mandatory Repository Inspection:
- **Application Topology**: The project uses **four independent Vite applications** located in `portals/health-centre`, `portals/hospital`, `portals/transport`, and `portals/administrator`. Each application runs on a dedicated port (`5173`, `5174`, `5175`, `5176`) with independent entry points (`index.html`, `src/main.jsx`, `src/App.jsx`) and independent Vite configurations (`vite.config.js`).
- **Collage / Development Orchestrator**: The root directory contains a development orchestrator (`src/App.jsx`) on port 3000 which provides a side-by-side view of all four portals for rapid evaluation and unified testing.
- **Shared Workspace Alias**: All four portal `vite.config.js` configurations define `@shared` resolving to the top-level `shared/` directory:
  ```javascript
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared'),
      '@': path.resolve(__dirname, './src')
    }
  }
  ```
- **Existing Gaps in `shared/`**:
  - `shared/components/` is empty (`.gitkeep` only). Reusable buttons, forms, cards, badges, and modals are missing, leading to duplicated styles across portal pages.
  - `shared/constants/` is empty (`.gitkeep` only). Role definitions, portal keys, triage severities, and route paths are hardcoded strings.
  - `shared/styles/theme.css` has an incomplete 36-line token set with basic greens and blues, lacking a comprehensive light/dark palette, typography scale, spacing scale, z-index scale, elevation, border-radius, focus rings, etc.
  - `shared/hooks/useTheme.js` toggles `dark` class on `document.documentElement` per portal key, but doesn't handle system preferences (`prefers-color-scheme`), theme transitions, or theme synchronization.
  - `shared/services/apiClient.js` targets `/api` (instead of `/api/v1`), lacks request ID propagation (`X-Request-Id`), lacks error normalization against the Part 11 backend envelope (`{ success, error: { code, message, details } }`), lacks request cancellation (`AbortController`), and lacks centralized auth token lifecycle integration (`careconnect_access_token`).
  - Portal layouts duplicate sidebar structures, brand banners, user profile popups, and logout procedures without centralized layouts or route protection guards.

---

### 2. Target Frontend Architecture

To resolve duplication while preserving the independent build and runtime characteristics of each portal, the shared architecture is structured around five pillars:

```
                            ┌─────────────────────────────────────────┐
                            │               shared/                   │
                            │   Central Shared Frontend Architecture   │
                            └────────────────────┬────────────────────┘
                                                 │
          ┌──────────────────────┬───────────────┴──────────────┬──────────────────────┐
          ▼                      ▼                              ▼                      ▼
  ┌───────────────┐      ┌───────────────┐              ┌───────────────┐      ┌───────────────┐
  │  Design System│      │ Reusable UI   │              │ Layout Engine │      │ Client & Auth │
  │ & Token Core  │      │ Component Lib │              │ & Navigation  │      │ Integration   │
  │ - theme.css   │      │ - Button      │              │ - Header      │      │ - apiClient.js│
  │ - ThemeContext│      │ - Form inputs │              │ - Sidebar     │      │ - AuthContext │
  │ - useTheme    │      │ - Cards/Badges│              │ - Breadcrumbs │      │ - useAuth     │
  │ - Triage tokens│     │ - Modals/Toast│              │ - MobileNav   │      │ - Error norm  │
  └───────────────┘      └───────────────┘              └───────────────┘      └───────────────┘
                                                 │
                                                 ▼
       ┌───────────────────┬─────────────────────┼─────────────────────┬───────────────────┐
       ▼                   ▼                     ▼                     ▼                   ▼
┌───────────────┐   ┌───────────────┐     ┌───────────────┐     ┌───────────────┐   ┌───────────────┐
│ Health Centre │   │   Hospital    │     │   Transport   │     │ Administrator │   │ Root Collage  │
│ Portal (:5173)│   │ Portal (:5174)│     │ Portal (:5175)│     │ Portal (:5176)│   │ Portal (:3000)│
└───────────────┘   └───────────────┘     └───────────────┘     └───────────────┘   └───────────────┘
```

#### Core Design Decisions:
1. **Preserve Independent Portals**: Maintain the four independent Vite workspaces (`portals/*`). This matches the production deployment model where different healthcare facilities run on isolated subdomains or local clinic network servers.
2. **Centralize Shared Primitives in `shared/`**: All reusable UI components, layouts, theme providers, hooks, API utilities, and constants live in `shared/` and are consumed via the existing `@shared` alias.
3. **No TypeScript Migration Required**: Existing code is standard React 18 / ES Modules. Preserving JavaScript avoids complex build step alterations and guarantees zero regression in existing build pipelines.
4. **Authoritative Backend Security**: Frontend route guards (`ProtectedRoute`, `RoleRoute`) enhance user experience by preventing unauthorized navigation, but never serve as the security perimeter. The backend Express API remains authoritative for all mutations and reads.
5. **Universal WCAG 2.1 AA Accessibility**: High-contrast ratios, visible focus indicators, screen reader ARIA labels, semantic HTML5 landmarks, and full keyboard navigation across all shared components.

---

### 3. Shared Directory Layout

```text
shared/
├── index.js                    # Barrel export gateway
├── components/
│   ├── ui/                     # Primitives (Button, etc.)
│   ├── forms/                  # Inputs, Select, Textarea, Checkbox, Radio, Search
│   ├── display/                # Card, Badge, StatusIndicator, Avatar, Divider, EmptyState, Pagination
│   ├── feedback/               # Alert, Modal, Toast, Skeleton, Spinner
│   └── layout/                 # SharedHeader, SharedSidebar, SharedMobileNav, Breadcrumbs, PortalLayout
├── constants/
│   ├── index.js                # Constants barrel
│   ├── portals.js              # Portal metadata, ports, themes
│   ├── roles.js                # System roles & permissions
│   ├── routes.js               # Route paths per portal
│   └── triage.js               # Triage severities & response SLA constants
├── context/
│   ├── ThemeContext.jsx        # Light/Dark/System theme provider
│   └── AuthContext.jsx         # User session, role & token provider
├── hooks/
│   ├── useTheme.js             # Theme hook
│   ├── useAuth.js              # Auth & permission hook
│   ├── useCareConnectData.js   # Legacy mock data compatibility hook
│   └── useDebounce.js          # Search debounce hook
├── router/
│   ├── ProtectedRoute.jsx      # Auth token guard
│   ├── RoleRoute.jsx           # RBAC permission guard
│   ├── NotFoundPage.jsx        # 404 error page
│   └── UnauthorizedPage.jsx    # 403 error page
├── services/
│   ├── apiClient.js            # Standardized Axios instance with X-Request-Id & error normalization
│   ├── authService.js          # Login, logout, refresh API calls
│   └── dataService.js          # Referral & facility API calls
├── styles/
│   └── theme.css               # Comprehensive CSS variables & tokens
└── utils/
    ├── index.js                # Utilities barrel
    ├── cn.js                   # Class merging helper
    ├── formatters.js           # Date, time, phone & national ID formatters
    └── storage.js              # Safe browser storage helper
```

---

### 4. Implementation & Migration Plan (Commits 113–120)

| Commit # | Focus Area | Deliverables |
|---|---|---|
| **113** | Architecture Foundation | Assessment document, `shared/` directory structure, constants, utils, barrel exports. |
| **114** | Design Tokens & Theme | Comprehensive `theme.css`, `ThemeContext.jsx`, accessible dark mode & system preference handling. |
| **115** | Reusable UI Components | Accessible Buttons, Form controls, Cards, Badges, Modals, Toasts, Skeletons, Dividers. |
| **116** | Shared Layout Engine | `SharedHeader`, `SharedSidebar`, `SharedMobileNav`, `Breadcrumbs`, `PortalLayout`. |
| **117** | Portal Routing & Guards | `ProtectedRoute`, `RoleRoute`, 404/403 pages, refactored portal layout integrations across all 4 portals. |
| **118** | API Client & Auth Integration | Axios client with `/api/v1`, `X-Request-Id`, error taxonomy normalization, `AuthContext`. |
| **119** | Accessibility & Performance | Responsive testing, focus rings, reduced motion, React lazy-loading, memoization. |
| **120** | Verification & Test Suite | Unit tests in `shared/tests/`, build verification across all 4 portals, documentation updates, Part 15 report. |

All changes maintain full backward compatibility with existing portal pages and the root development collage.
