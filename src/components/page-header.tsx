import Link from "next/link";
import { GridIcon, InfoIcon } from "@/components/icons";

export function PageHeader({
  title,
  accessory,
  action,
}: {
  title: string;
  accessory?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="page-head">
      <h1>
        {title}
        {accessory}
      </h1>
      <div className="head-actions">
        {action ? (
          <Link className="btn btn-ghost" href={action.href}>
            {action.label}
          </Link>
        ) : null}
        <div className="view-tools">
          <Link className="tool" href="/" aria-label="Visão geral">
            <GridIcon />
          </Link>
          <Link className="tool" href="/settings" aria-label="Ajustes do realm">
            <InfoIcon />
          </Link>
        </div>
      </div>
    </div>
  );
}
