import type { ReactNode } from "react";
import { AppBootstrap } from "@/shared/ui/AppBootstrap";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppBootstrap>{children}</AppBootstrap>;
}
