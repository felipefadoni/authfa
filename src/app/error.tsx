"use client";

import { LogoMark } from "@/components/icons";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="console-shell">
      <aside className="side">
        <a className="brand" href="/">
          <LogoMark />
          <span>AuthFa</span>
        </a>
      </aside>
      <div className="main-col">
        <header className="hello">
          <div>
            <h1>Algo quebrou</h1>
            <p>Não foi possível carregar o Authfa.</p>
          </div>
        </header>
        <button className="btn btn-primary" type="button" onClick={reset}>
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
