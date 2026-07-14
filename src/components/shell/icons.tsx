/* 14×14 nav glyphs, traced from the design handoff. All use currentColor. */

export function IconDashboard() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor" />
      <rect x="8" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity=".45" />
      <rect x="1" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity=".45" />
      <rect x="8" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity=".45" />
    </svg>
  );
}

export function IconClients() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="5" cy="4.5" r="2.6" fill="currentColor" />
      <circle cx="10" cy="5.5" r="2" fill="currentColor" opacity=".45" />
      <rect x="1" y="9" width="12" height="4" rx="2" fill="currentColor" opacity=".45" />
    </svg>
  );
}

export function IconLeads() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <rect x="1" y="1" width="3.4" height="12" rx="1.2" fill="currentColor" />
      <rect x="5.3" y="1" width="3.4" height="8" rx="1.2" fill="currentColor" opacity=".55" />
      <rect x="9.6" y="1" width="3.4" height="5" rx="1.2" fill="currentColor" opacity=".3" />
    </svg>
  );
}

export function IconTrials() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".45" />
      <path d="M7 4v3.2l2.3 1.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconBilling() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <rect x="1" y="2.5" width="12" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
      <rect x="1" y="4.6" width="12" height="2.2" fill="currentColor" />
    </svg>
  );
}

export function IconSupport() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".55" />
      <circle cx="7" cy="7" r="2" fill="currentColor" />
    </svg>
  );
}

export function IconConversations() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <rect x="1" y="1.5" width="12" height="8.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
      <path d="M4 10v2.5L7.2 10" fill="currentColor" opacity=".55" />
      <circle cx="4.6" cy="5.7" r="1" fill="currentColor" />
      <circle cx="7" cy="5.7" r="1" fill="currentColor" />
      <circle cx="9.4" cy="5.7" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconAiHealth() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <path
        d="M1 7h2.6l1.6-3.6 2.4 7 1.7-3.4H13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconAnalytics() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <rect x="1.5" y="8" width="2.8" height="5" rx="1" fill="currentColor" opacity=".45" />
      <rect x="5.6" y="4.5" width="2.8" height="8.5" rx="1" fill="currentColor" />
      <rect x="9.7" y="1" width="2.8" height="12" rx="1" fill="currentColor" opacity=".45" />
    </svg>
  );
}

export function IconSettings() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="2.2" fill="currentColor" />
      <circle
        cx="7"
        cy="7"
        r="5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2.7 2"
        opacity=".55"
      />
    </svg>
  );
}

export function IconSearch({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12">
      <circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconLogout() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14">
      <path
        d="M6 1.5H2.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 4.3 12.5 7l-3 2.7M12.5 7H5.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBell() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15">
      <path
        d="M7.5 1.5c-2.2 0-3.7 1.6-3.7 3.9v2.2L2.5 10h10l-1.3-2.4V5.4c0-2.3-1.5-3.9-3.7-3.9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6 12a1.6 1.6 0 003 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
