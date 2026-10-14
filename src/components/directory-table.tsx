import Link from "next/link";
import { AvatarStack } from "@/components/avatar-stack";
import { DocIcon, LinkIcon, MoreIcon } from "@/components/icons";

type MenuItem =
  | { type: "link"; href: string; label: string }
  | {
      type: "action";
      label: string;
      action: (formData: FormData) => void | Promise<void>;
      fields: Record<string, string | undefined>;
      danger?: boolean;
    };

export type DirectoryRow = {
  id: string;
  href: string;
  tone: "blue" | "green" | "red" | "orange" | "violet";
  title: string;
  avatars: { initials: string; color: string; label?: string }[];
  middle?: string;
  modified: string;
  meta: string;
  selected?: boolean;
  menu: MenuItem[];
};

export function DirectoryTable({
  columns,
  rows,
  empty,
}: {
  columns: { name: string; middle: string; modified: string; meta: string };
  rows: DirectoryRow[];
  empty: string;
}) {
  return (
    <table className="directory">
      <thead>
        <tr>
          <th>{columns.name}</th>
          <th>{columns.middle}</th>
          <th>{columns.modified}</th>
          <th className="num">{columns.meta}</th>
          <th aria-label="Ações" />
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td className="empty" colSpan={5}>
              {empty}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id} className={row.selected ? "is-selected" : undefined}>
              <td>
                <div className="name-cell">
                  <DocIcon tone={row.tone} />
                  <Link href={row.href}>{row.title}</Link>
                </div>
              </td>
              <td>
                {row.avatars.length > 0 ? <AvatarStack people={row.avatars} small /> : <span className="when">{row.middle}</span>}
              </td>
              <td className="when">{row.modified}</td>
              <td className="num">{row.meta}</td>
              <td>
                <div className="row-actions">
                  <Link className="icon-button" href={row.href} aria-label={`Abrir ${row.title}`}>
                    <LinkIcon />
                  </Link>
                  {row.menu.length > 0 ? (
                    <details className="menu">
                      <summary className="icon-button" aria-label={`Ações de ${row.title}`}>
                        <MoreIcon />
                      </summary>
                      <div className="menu-pop">
                        {row.menu.map((item) =>
                          item.type === "link" ? (
                            <Link key={item.label} href={item.href}>
                              {item.label}
                            </Link>
                          ) : (
                            <form key={item.label} action={item.action}>
                            {Object.entries(item.fields).map(([name, value]) =>
                              value ? <input key={name} type="hidden" name={name} value={value} /> : null,
                            )}
                              <button className={item.danger ? "danger" : undefined} type="submit">
                                {item.label}
                              </button>
                            </form>
                          ),
                        )}
                      </div>
                    </details>
                  ) : null}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
