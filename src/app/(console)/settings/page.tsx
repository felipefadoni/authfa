import type { Metadata } from "next";
import { headers } from "next/headers";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { readParams } from "@/lib/query";
import { updateRealmAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requireConsoleContext();
  const query = await readParams(searchParams);
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const issuer = `${proto}://${host}/realms/${context.realm.name}`;

  return (
    <>
      <PageHeader title="Ajustes do realm" />
      <Notice error={query.error} saved={query.saved} />
      <form className="panel" action={updateRealmAction}>
        <label className="field">
          <span>Nome de exibição</span>
          <input name="displayName" required defaultValue={context.realm.displayName} />
        </label>
        <label className="field">
          <span>Access token (segundos)</span>
          <input name="accessTokenTtl" type="number" min={60} max={86400} required defaultValue={context.realm.accessTokenTtl} />
        </label>
        <div className="field">
          <span>Issuer</span>
          <p className="endpoint">{issuer}</p>
        </div>
        <div className="field">
          <span>Discovery</span>
          <p className="endpoint">{issuer}/.well-known/openid-configuration</p>
        </div>
        <button className="btn btn-primary" type="submit">
          Salvar
        </button>
      </form>
    </>
  );
}
