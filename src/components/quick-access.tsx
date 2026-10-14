"use client";

import { useRef } from "react";
import { ChevronIcon } from "@/components/icons";

export function QuickScroller({ children }: { children: React.ReactNode }) {
  const row = useRef<HTMLDivElement>(null);

  return (
    <div className="quick-wrap">
      <div className="quick-row" ref={row}>
        {children}
      </div>
      <button
        type="button"
        className="quick-next"
        aria-label="Próximos atalhos"
        onClick={() => row.current?.scrollBy({ left: 230, behavior: "smooth" })}
      >
        <ChevronIcon />
      </button>
    </div>
  );
}
