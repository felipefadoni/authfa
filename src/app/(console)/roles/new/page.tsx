import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { readParams } from "@/lib/query";
import { createRoleAction } from "@/server/actions";

export const metadata: Metadata = { title: "Novo papel" };

export default async function NewRolePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await readParams(searchParams);
  return (
    <>
      <PageHeader title="Novo papel" />
      <Notice error={query.error} />
      <form className="panel" action={createRoleAction}>
        <label className="field">
          <span>Nome</span>
          <input name="name" required placeholder="editor" />
        </label>
        <label className="field">
          <span>Descrição</span>
          <input name="description" />
        </label>
        <button className="btn btn-primary" type="submit">
          Criar papel
        </button>
      </form>
    </>
  );
}
