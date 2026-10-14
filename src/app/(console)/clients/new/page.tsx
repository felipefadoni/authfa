import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { readParams } from "@/lib/query";
import { createClientAction } from "@/server/actions";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NewClientPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await readParams(searchParams);

  return (
    <>
      <PageHeader title="Novo cliente" />
      <Notice error={query.error} />
      <form className="panel" action={createClientAction}>
        <label className="field">
          <span>Nome</span>
          <input name="name" required />
        </label>
        <label className="field">
          <span>Client ID</span>
          <input name="clientId" required placeholder="minha-aplicacao" />
        </label>
        <label className="field">
          <span>Descrição</span>
          <input name="description" />
        </label>
        <label className="field">
          <span>Redirect URIs</span>
          <textarea name="redirectUris" required defaultValue="http://localhost:3000/callback" />
        </label>
        <label className="check">
          <input type="checkbox" name="publicClient" />
          Cliente público, sem segredo
        </label>
        <button className="btn btn-primary" type="submit">
          Criar cliente
        </button>
      </form>
    </>
  );
}
