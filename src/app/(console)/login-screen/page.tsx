import type { Metadata } from "next";
import { LoginThemeForm } from "@/components/login-theme-form";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { readParams } from "@/lib/query";
import { requireConsoleContext } from "@/server/console";
import { getLoginTheme } from "@/server/directory";

export const metadata: Metadata = { title: "Tela de login" };

export default async function LoginScreenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireConsoleContext();
  const query = await readParams(searchParams);
  const theme = await getLoginTheme(context.realm.id);

  return (
    <>
      <PageHeader title="Tela de login" />
      <Notice error={query.error} saved={query.saved} />
      <LoginThemeForm theme={theme} />
    </>
  );
}
