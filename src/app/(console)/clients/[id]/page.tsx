import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { readParams } from "@/lib/query";
import { deleteClientAction, regenerateSecretAction, updateClientAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";
import { getClient, parseJsonList } from "@/server/directory";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireConsoleContext();
  const { id } = await params;
  const query = await readParams(searchParams);
  const client = await getClient(context.realm.id, id);
  if (!client) notFound();

  const redirects = parseJsonList(client.redirect_uris);
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;
  const authUrl = new URL(`/realms/${context.realm.name}/protocol/openid-connect/auth`, origin);
  authUrl.searchParams.set("client_id", client.client_id);
  authUrl.searchParams.set("redirect_uri", redirects[0] ?? "");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("state", "demo");

  return (
    <>
      <PageHeader title={client.name} />
      <Notice error={query.error} saved={query.saved} />
      <form className="panel" action={updateClientAction}>
        <input type="hidden" name="id" value={client.id} />
        <p className="lede">Client ID {client.client_id}</p>
        <label className="field">
          <span>Nome</span>
          <input name="name" required defaultValue={client.name} />
        </label>
        <label className="field">
          <span>Descrição</span>
          <input name="description" defaultValue={client.description} />
        </label>
        <label className="field">
          <span>Redirect URIs</span>
          <textarea name="redirectUris" required defaultValue={redirects.join("\n")} />
        </label>
        <label className="check">
          <input type="checkbox" name="enabled" defaultChecked={Boolean(client.enabled)} />
          Cliente ativo
        </label>
        <label className="check">
          <input type="checkbox" name="standardFlow" defaultChecked={Boolean(client.standard_flow)} />
          Authorization code flow
        </label>
        <div className="field">
          <span>Segredo</span>
          {client.public_client || !client.secret ? (
            <p className="secret">Cliente público, sem segredo.</p>
          ) : (
            <p className="secret">{client.secret}</p>
          )}
        </div>
        <button className="btn btn-primary" type="submit">
          Salvar
        </button>
      </form>
      <div className="panel">
        <span className="section-label">Endpoints</span>
        <p className="endpoint">{origin}/realms/{context.realm.name}/.well-known/openid-configuration</p>
        {redirects[0] ? (
          <a className="btn btn-ghost" href={authUrl.pathname + authUrl.search}>
            Testar login
          </a>
        ) : null}
        {client.client_id === "customer-app" ? (
          <p className="lede">No teste, entre como maya / Acme12345!.</p>
        ) : null}
        <div className="actions">
          {client.public_client ? null : (
            <form action={regenerateSecretAction}>
              <input type="hidden" name="id" value={client.id} />
              <button className="btn btn-ghost" type="submit">
                Gerar outro segredo
              </button>
            </form>
          )}
          <form action={deleteClientAction}>
            <input type="hidden" name="id" value={client.id} />
            <button className="btn btn-danger" type="submit">
              Remover cliente
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
