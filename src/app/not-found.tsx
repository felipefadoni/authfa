import { AuthCard } from "@/components/auth-card";

export default function NotFound() {
  return (
    <AuthCard title="Página não encontrada" lede="Esse caminho não existe no Authfa.">
      <a className="btn btn-primary" href="/">
        Voltar ao console
      </a>
    </AuthCard>
  );
}
