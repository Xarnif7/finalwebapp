export type NavItem = {
  id: string;
  label: string;
  icon: string;
  path: string;
  section: 'workspace' | 'admin';
  children?: NavItem[];
  featureFlag?: string;
};

export const NAV: NavItem[] = [
  { id: 'home',      label: 'Home',       icon: 'Home',      path: '/home',       section: 'workspace' },
  { id: 'inbox',     label: 'Inbox',      icon: 'Inbox',     path: '/inbox',      section: 'workspace' },
  { id: 'customers', label: 'Customers',  icon: 'Users',     path: '/customers',  section: 'workspace' },
  { id: 'autopilot', label: 'Autopilot',  icon: 'Bot',       path: '/autopilot',  section: 'workspace' },
  { id: 'requests',  label: 'Requests',   icon: 'Send',      path: '/requests',   section: 'workspace' },
  { id: 'insights',  label: 'Insights',   icon: 'LineChart', path: '/insights',   section: 'workspace',
    children: [
      { id:'insights-performance', label:'Performance', icon:'TrendingUp', path:'/insights?view=performance', section:'workspace' },
      { id:'insights-reports',     label:'Reports',     icon:'BarChart3',  path:'/insights?view=reports',     section:'workspace' },
      { id:'insights-competitors', label:'Competitors', icon:'Shield',     path:'/insights?view=competitors', section:'workspace', featureFlag:'competitors' },
    ]
  },
  { id:'team',     label:'Team & Roles', icon:'UsersRound', path:'/admin/team',      section:'admin' },
  { id:'audit',    label:'Audit Log',    icon:'Clipboard',  path:'/admin/audit-log', section:'admin' },
  { id:'settings', label:'Settings',     icon:'Settings',   path:'/admin/settings',  section:'admin' },
];


