import type { Metadata } from "next";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { readParams } from "@/lib/query";
import { createGroupAction } from "@/server/actions";

export const metadata: Metadata = { title: "Novo grupo" };

export default async function NewGroupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await readParams(searchParams);
  return (
    <>
      <PageHeader title="Novo grupo" />
      <Notice error={query.error} />
      <form className="panel" action={createGroupAction}>
        <label className="field">
          <span>Nome</span>
          <input name="name" required />
        </label>
        <label className="field">
          <span>Descrição</span>
          <input name="description" />
        </label>
        <button className="btn btn-primary" type="submit">
          Criar grupo
        </button>
      </form>
    </>
  );
}
