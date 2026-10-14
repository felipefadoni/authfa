export function Notice({ error, saved }: { error?: string; saved?: boolean }) {
  if (error) {
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  }
  if (saved) {
    return (
      <p className="form-saved" role="status">
        Alterações salvas.
      </p>
    );
  }
  return null;
}
