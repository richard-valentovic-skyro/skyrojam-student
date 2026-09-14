import { AppShell } from "@/shared/shell/AppShell";
import { STUDENT } from "@/lib/nav";

export default function StudentLayout({ children }: LayoutProps<"/">) {
  return <AppShell cfg={STUDENT}>{children}</AppShell>;
}
