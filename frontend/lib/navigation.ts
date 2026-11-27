import {
  Activity,
  BarChart3,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardList,
  DatabaseZap,
  FileSearch,
  FileText,
  Kanban,
  KeyRound,
  LayoutDashboard,
  Search,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react';
import { SidebarNavItem } from '@/components/navigation/Sidebar';

export const CANDIDATE_NAV_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/candidate/dashboard' },
  { id: 'profile', label: 'My Profile', icon: UserCircle, href: '/candidate/profile' },
  { id: 'jobs', label: 'Explore Jobs', icon: Search, href: '/candidate/jobs' },
  { id: 'saved-jobs', label: 'Saved Jobs', icon: Bookmark, href: '/candidate/saved-jobs' },
  { id: 'resumes', label: 'Resume Vault', icon: FileText, href: '/candidate/resumes' },
  {
    id: 'applications',
    label: 'My Applications',
    icon: ClipboardList,
    href: '/candidate/applications',
  },
  { id: 'interviews', label: 'Interviews', icon: CalendarClock, href: '/candidate/interviews' },
  { id: 'notifications', label: 'Notifications', icon: Bell, href: '/candidate/notifications' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/candidate/settings' },
];

export const RECRUITER_NAV_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/recruiter/dashboard' },
  { id: 'company', label: 'Company Profile', icon: Building2, href: '/recruiter/company' },
  { id: 'jobs', label: 'Job Management', icon: Briefcase, href: '/recruiter/jobs' },
  { id: 'pipeline', label: 'Candidate Pipeline', icon: Kanban, href: '/recruiter/pipeline' },
  { id: 'interviews', label: 'Interviews', icon: CalendarClock, href: '/recruiter/interviews' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/recruiter/analytics' },
  { id: 'notifications', label: 'Alerts', icon: Bell, href: '/recruiter/notifications' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/recruiter/settings' },
];

export const ADMIN_NAV_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/admin/dashboard' },
  { id: 'users', label: 'Users', icon: Users, href: '/admin/users' },
  { id: 'companies', label: 'Companies', icon: Building2, href: '/admin/companies' },
  { id: 'roles', label: 'RBAC Roles', icon: KeyRound, href: '/admin/roles' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
  { id: 'audit-logs', label: 'Audit Logs', icon: FileSearch, href: '/admin/audit-logs' },
  { id: 'retention', label: 'Retention', icon: DatabaseZap, href: '/admin/retention' },
  { id: 'system', label: 'System Health', icon: Activity, href: '/admin/system' },
];
