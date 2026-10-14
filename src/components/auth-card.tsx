import { LogoMark } from "@/components/icons";
import { loginBackgroundStyle, type LoginTheme } from "@/lib/login-theme";

export function AuthCard({
  title,
  lede,
  children,
  theme,
}: {
  title: string;
  lede?: string;
  children: React.ReactNode;
  theme?: LoginTheme;
}) {
  return (
    <div className={theme ? "stage stage-plain" : "stage"} style={theme ? loginBackgroundStyle(theme) : undefined}>
      <section className="login-window">
        {theme ? (
          theme.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="login-icon" src={theme.iconUrl} alt="" width={theme.iconSize} height={theme.iconSize} />
          ) : null
        ) : (
          <LogoMark />
        )}
        <h1 className={theme ? "login-title-center" : undefined}>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
        {children}
      </section>
    </div>
  );
}
