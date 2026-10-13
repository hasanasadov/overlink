import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { localePath } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return pageMetadata({ path: "/forgot", title: "seo.forgot.title" });
}

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [user, locale, sp] = await Promise.all([getUser(), getLocale(), searchParams]);
  if (user) redirect(localePath(locale, "/account"));
  return <AuthForm mode="forgot" next={sp.next} />;
}
