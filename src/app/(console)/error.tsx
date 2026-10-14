"use client";

export default function ConsoleError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel">
      <h1>Não foi possível abrir esta página</h1>
      <p className="lede">O console encontrou um erro ao ler o realm.</p>
      <button className="btn btn-primary" type="button" onClick={reset}>
        Tentar de novo
      </button>
    </div>
  );
}
