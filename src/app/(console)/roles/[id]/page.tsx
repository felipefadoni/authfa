import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvatarStack } from "@/components/avatar-stack";
import { PageHeader } from "@/components/page-header";
import { personAvatar } from "@/lib/format";
import { deleteRoleAction } from "@/server/actions";
import { requireConsoleContext } from "@/server/console";
import { getRole } from "@/server/directory";

export const metadata: Metadata = { title: "Papel" };

export default async function RolePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireConsoleContext();
  const { id } = await params;
  const role = await getRole(context.realm.id, id);
  if (!role) notFound();

  return (
    <>
      <PageHeader title={role.name} />
      <section className="panel">
        <p className="lede">{role.description || "Sem descrição."}</p>
        <ul className="member-list">
          {role.members.map((member) => (
            <li key={member.id}>
              <Link href={`/users/${member.id}`}>
                <AvatarStack people={[personAvatar(member.first_name, member.last_name, member.username)]} />
                {member.first_name} {member.last_name}
              </Link>
            </li>
          ))}
          {role.members.length === 0 ? <li>Ninguém com esse papel.</li> : null}
        </ul>
        <form action={deleteRoleAction}>
          <input type="hidden" name="id" value={role.id} />
          <button className="btn btn-danger" type="submit">
            Remover papel
          </button>
        </form>
      </section>
    </>
  );
}
