import { AdminShell } from '@/components/admin/AdminShell';

export const metadata = {
  title: 'Admin — CrispRun',
  description: 'CrispRun Admin Panel',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
