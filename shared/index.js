/**
 * CareConnect Ethiopia - Shared Library Gateway
 * Central re-export of constants, utilities, hooks, context, components, router, and API client.
 */

// Constants
export * from './constants/index.js';

// Utilities
export * from './utils/index.js';

// Context & Hooks
export * from './context/ThemeContext.jsx';
export * from './context/AuthContext.jsx';
export * from './hooks/useTheme.js';
export * from './hooks/useAuth.js';

// Services
export * from './services/apiClient.js';
export * from './services/authService.js';

// Router & Guards
export * from './router/index.js';
export * from './router/ProtectedRoute.jsx';
export * from './router/RoleRoute.jsx';
export * from './router/NotFoundPage.jsx';
export * from './router/UnauthorizedPage.jsx';

// UI Primitives
export * from './components/ui/Button.jsx';

// Form Components
export * from './components/forms/TextInput.jsx';
export * from './components/forms/PasswordInput.jsx';
export * from './components/forms/Select.jsx';
export * from './components/forms/Textarea.jsx';
export * from './components/forms/Checkbox.jsx';
export * from './components/forms/SearchInput.jsx';

// Display Components
export * from './components/display/Card.jsx';
export * from './components/display/Badge.jsx';
export * from './components/display/StatusIndicator.jsx';
export * from './components/display/Avatar.jsx';
export * from './components/display/Divider.jsx';
export * from './components/display/EmptyState.jsx';
export * from './components/display/Pagination.jsx';

// Feedback Components
export * from './components/feedback/Alert.jsx';
export * from './components/feedback/Spinner.jsx';
export * from './components/feedback/Skeleton.jsx';
export * from './components/feedback/Modal.jsx';
export * from './components/feedback/Toast.jsx';
export * from './components/feedback/LiveAnnouncer.jsx';

// Layout & Navigation Components
export * from './components/layout/SharedHeader.jsx';
export * from './components/layout/SharedSidebar.jsx';
export * from './components/layout/SharedMobileNav.jsx';
export * from './components/layout/Breadcrumbs.jsx';
export * from './components/layout/PortalLayout.jsx';
export * from './components/layout/SkipToContent.jsx';
