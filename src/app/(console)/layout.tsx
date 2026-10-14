import { ConsoleFrame } from "@/components/console-frame";
import { requireConsoleContext } from "@/server/console";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const context = await requireConsoleContext();
  return <ConsoleFrame context={context}>{children}</ConsoleFrame>;
}
