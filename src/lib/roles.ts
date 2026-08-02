import {
  Activity,
  BadgeDollarSign,
  BookOpen,
  Boxes,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  Library,
  Megaphone,
  Package,
  Receipt,
  ShieldAlert,
  Users,
  UserSquare2,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppRole =
  | "director"
  | "head_of_studies"
  | "head_of_discipline"
  | "nurse"
  | "teacher"
  | "economist"
  | "storekeeper"
  | "parent"
  | "student";

export const ROLE_LABELS: Record<AppRole, string> = {
  director: "Director",
  head_of_studies: "Head of Studies",
  head_of_discipline: "Head of Discipline",
  nurse: "School Nurse",
  teacher: "Teacher",
  economist: "Economist / Bursar",
  storekeeper: "Storekeeper",
  parent: "Parent",
  student: "Student",
};

export const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

export const STAFF_ROLES: AppRole[] = [
  "director",
  "head_of_studies",
  "head_of_discipline",
  "nurse",
  "teacher",
  "economist",
  "storekeeper",
];

export function isAdminRole(role: AppRole | undefined | null) {
  return role === "director" || role === "head_of_studies";
}

export type NavItem = {
  title: string;
  to: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

const overview: NavItem = { title: "Overview", to: "/dashboard", icon: LayoutDashboard };

const adminNav: NavGroup[] = [
  { label: "Overview", items: [overview] },
  {
    label: "Academics",
    items: [
      { title: "Classes", to: "/admin/classes", icon: Library },
      { title: "Subjects", to: "/admin/subjects", icon: BookOpen },
      { title: "Teacher assignments", to: "/admin/assignments", icon: ClipboardList },
      { title: "Reports", to: "/admin/reports", icon: FileBarChart },
      { title: "Command centre", to: "/command-center", icon: Activity },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Students", to: "/admin/students", icon: GraduationCap },
      { title: "Staff accounts", to: "/admin/staff", icon: UserSquare2 },
      { title: "Parents", to: "/admin/parents", icon: Users },
    ],
  },
  {
    label: "School life",
    items: [
      { title: "Attendance", to: "/app/attendance", icon: CalendarCheck },
      { title: "Discipline", to: "/discipline", icon: ShieldAlert },
      { title: "Infirmary", to: "/medical", icon: HeartPulse },
      { title: "Finance", to: "/finance", icon: Wallet },
      { title: "Store", to: "/store", icon: Boxes },
      { title: "Announcements", to: "/app/announcements", icon: Megaphone },
    ],
  },
];

export const ROLE_NAV: Record<AppRole, NavGroup[]> = {
  director: adminNav,
  head_of_studies: adminNav,
  head_of_discipline: [
    { label: "Overview", items: [overview] },
    {
      label: "Discipline",
      items: [
        { title: "Incidents", to: "/discipline", icon: ShieldAlert },
        { title: "Sanctions", to: "/discipline", icon: ClipboardList },
        { title: "Attendance issues", to: "/discipline/analytics", icon: CalendarCheck },
        { title: "Students", to: "/discipline", icon: GraduationCap },
        { title: "Reports", to: "/discipline/analytics", icon: FileBarChart },
      ],
    },
  ],
  nurse: [
    { label: "Overview", items: [overview] },
    {
      label: "Infirmary",
      items: [
        { title: "Medical visits", to: "/medical", icon: HeartPulse },
        { title: "New visit", to: "/medical", icon: Activity },
        { title: "Student health files", to: "/medical", icon: GraduationCap },
        { title: "Reports", to: "/medical", icon: FileBarChart },
      ],
    },
  ],
  teacher: [
    { label: "Overview", items: [overview] },
    {
      label: "Teaching",
      items: [
        { title: "My classes", to: "/teach", icon: Library },
        { title: "Attendance", to: "/teach", icon: CalendarCheck },
        { title: "Evaluations & grades", to: "/teach", icon: ClipboardList },
        { title: "Transcripts", to: "/transcripts", icon: FileBarChart },
      ],
    },
    {
      label: "More",
      items: [
        { title: "Timetable", to: "/app/timetable", icon: CalendarCheck },
        { title: "Announcements", to: "/app/announcements", icon: Megaphone },
      ],
    },
  ],
  economist: [
    { label: "Overview", items: [overview] },
    {
      label: "Finance",
      items: [
        { title: "Fee structures", to: "/finance/structures", icon: BadgeDollarSign },
        { title: "Payments", to: "/finance", icon: Receipt },
        { title: "Expenses", to: "/finance/expenses", icon: Wallet },
        { title: "Financial reports", to: "/finance/reports", icon: FileBarChart },
      ],
    },
  ],
  storekeeper: [
    { label: "Overview", items: [overview] },
    {
      label: "Store",
      items: [
        { title: "Stock items", to: "/store", icon: Package },
        { title: "Stock movements", to: "/store/movements", icon: Boxes },
        { title: "Low stock alerts", to: "/store/reports", icon: ShieldAlert },
        { title: "Reports", to: "/store/reports", icon: FileBarChart },
      ],
    },
  ],
  parent: [
    { label: "Overview", items: [overview] },
    {
      label: "My children",
      items: [
        { title: "Results", to: "/family", icon: ClipboardList },
        { title: "Attendance", to: "/family", icon: CalendarCheck },
        { title: "Discipline", to: "/family", icon: ShieldAlert },
        { title: "Fees", to: "/family", icon: Wallet },
        { title: "Messages", to: "/app/messages", icon: Megaphone },
      ],
    },
  ],
  student: [
    { label: "Overview", items: [overview] },
    {
      label: "My school",
      items: [
        { title: "My results", to: "/me", icon: ClipboardList },
        { title: "My attendance", to: "/me", icon: CalendarCheck },
        { title: "Timetable", to: "/app/timetable", icon: CalendarCheck },
        { title: "Announcements", to: "/app/announcements", icon: Megaphone },
      ],
    },
  ],
};
