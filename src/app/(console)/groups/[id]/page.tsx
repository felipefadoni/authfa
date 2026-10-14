import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvatarStack } from "@/components/avatar-stack";
import { PageHeader } from "@/components/page-header";
import { personAvatar } from "@/lib/format";
import { deleteGroupAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";
import { getGroup } from "@/server/directory";

export const metadata: Metadata = { title: "Grupo" };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireConsoleContext();
  const { id } = await params;
  const group = await getGroup(context.realm.id, id);
  if (!group) notFound();

  return (
    <>
      <PageHeader title={group.name} />
      <section className="panel">
        <p className="lede">{group.description || "Sem descrição."}</p>
        <ul className="member-list">
          {group.members.map((member) => (
            <li key={member.id}>
              <Link href={`/users/${member.id}`}>
                <AvatarStack people={[personAvatar(member.first_name, member.last_name, member.username)]} />
                {member.first_name} {member.last_name}
              </Link>
            </li>
          ))}
          {group.members.length === 0 ? <li>Nenhum membro.</li> : null}
        </ul>
        <form action={deleteGroupAction}>
          <input type="hidden" name="id" value={group.id} />
          <button className="btn btn-danger" type="submit">
            Remover grupo
          </button>
        </form>
      </section>
    </>
  );
}
