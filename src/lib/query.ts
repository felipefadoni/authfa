export async function readParams(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  return { q: one("q"), error: one("error"), saved: one("saved") === "1" };
}
