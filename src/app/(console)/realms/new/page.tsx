import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { readParams } from "@/lib/query";
import { createRealmAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";

export const metadata: Metadata = { title: "Novo realm" };

export default async function NewRealmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireConsoleContext();
  if (!context.systemAdmin) redirect("/");
  const query = await readParams(searchParams);

  return (
    <>
      <PageHeader title="Novo realm" />
      <Notice error={query.error} />
      <form className="panel" action={createRealmAction}>
        <p className="lede">O nome entra na URL do login. Exemplo: /realms/loja</p>
        <label className="field">
          <span>Nome</span>
          <input name="name" required placeholder="loja" autoComplete="off" />
        </label>
        <label className="field">
          <span>Nome de exibição</span>
          <input name="displayName" required placeholder="Loja" />
        </label>
        <button className="btn btn-primary" type="submit">
          Criar realm
        </button>
      </form>
    </>
  );
}
