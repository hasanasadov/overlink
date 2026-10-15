import type { Metadata } from "next";
import { AdminClient, AdminLogin } from "@/components/AdminClient";
import { adminConfigured, isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin configured={adminConfigured()} />;
  return <AdminClient />;
}
