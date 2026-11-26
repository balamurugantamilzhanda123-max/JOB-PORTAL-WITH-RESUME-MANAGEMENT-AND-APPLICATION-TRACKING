import {
  BarChart3,
  Bookmark,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  Kanban,
  LayoutDashboard,
  Search,
  Settings,
} from 'lucide-react';
import { SidebarNavItem } from '@/components/navigation/Sidebar';

export const CANDIDATE_NAV_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/candidate/dashboard' },
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
  { id: 'settings', label: 'Settings', icon: Settings, href: '/candidate/dashboard?view=settings' },
];

export const RECRUITER_NAV_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/recruiter/dashboard' },
  { id: 'company', label: 'Company Profile', icon: Building2, href: '/recruiter/company' },
  { id: 'jobs', label: 'Job Management', icon: Briefcase, href: '/recruiter/jobs' },
  { id: 'pipeline', label: 'Candidate Pipeline', icon: Kanban, href: '/recruiter/pipeline' },
  { id: 'interviews', label: 'Interviews', icon: CalendarClock, href: '/recruiter/interviews' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/recruiter/analytics' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/recruiter/dashboard?view=settings' },
];
