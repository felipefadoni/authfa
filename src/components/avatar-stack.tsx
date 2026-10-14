export function AvatarStack({
  people,
  small = false,
}: {
  people: { initials: string; color: string; label?: string }[];
  small?: boolean;
}) {
  const visible = people.slice(0, 4);
  return (
    <span className={small ? "stack stack-sm" : "stack"}>
      {visible.map((person, index) => (
        <span
          key={`${person.initials}-${index}`}
          className="stack-avatar"
          style={{ background: person.color }}
          title={person.label}
        >
          {person.initials}
        </span>
      ))}
    </span>
  );
}
