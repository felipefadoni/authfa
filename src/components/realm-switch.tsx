"use client";

import { switchRealmAction } from "@/server/actions";

export function RealmSwitch({
  realms,
  current,
}: {
  realms: { name: string; displayName: string }[];
  current: string;
}) {
  return (
    <form className="realm-switch" action={switchRealmAction}>
      <select
        key={current}
        name="realm"
        aria-label="Realm"
        defaultValue={current}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {realms.map((realm) => (
          <option key={realm.name} value={realm.name}>
            {realm.displayName}
          </option>
        ))}
      </select>
    </form>
  );
}
