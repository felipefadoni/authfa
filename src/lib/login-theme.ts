export type LoginTheme = {
  backgroundMode: "color" | "image";
  backgroundColor: string;
  imageUrl: string;
  imageFit: "cover" | "contain";
  imagePosition: "center" | "top" | "bottom";
  title: string;
  subtitle: string;
  buttonLabel: string;
  usernameLabel: string;
  passwordLabel: string;
  iconUrl: string;
  iconSize: number;
};

export function defaultLoginTheme(): LoginTheme {
  return {
    backgroundMode: "color",
    backgroundColor: "#f6f6f4",
    imageUrl: "",
    imageFit: "cover",
    imagePosition: "center",
    title: "",
    subtitle: "",
    buttonLabel: "",
    usernameLabel: "",
    passwordLabel: "",
    iconUrl: "",
    iconSize: 48,
  };
}

export function parseLoginTheme(raw: string | null | undefined): LoginTheme {
  const theme = defaultLoginTheme();
  if (!raw) return theme;
  try {
    const parsed = JSON.parse(raw) as Partial<LoginTheme>;
    if (parsed.backgroundMode === "color" || parsed.backgroundMode === "image") theme.backgroundMode = parsed.backgroundMode;
    if (isHexColor(parsed.backgroundColor)) theme.backgroundColor = parsed.backgroundColor;
    if (typeof parsed.imageUrl === "string" && isSafeImageUrl(parsed.imageUrl)) theme.imageUrl = parsed.imageUrl;
    if (parsed.imageFit === "cover" || parsed.imageFit === "contain") theme.imageFit = parsed.imageFit;
    if (parsed.imagePosition === "center" || parsed.imagePosition === "top" || parsed.imagePosition === "bottom") {
      theme.imagePosition = parsed.imagePosition;
    }
    theme.title = clip(parsed.title, 80);
    theme.subtitle = clip(parsed.subtitle, 160);
    theme.buttonLabel = clip(parsed.buttonLabel, 40);
    theme.usernameLabel = clip(parsed.usernameLabel, 40);
    theme.passwordLabel = clip(parsed.passwordLabel, 40);
    if (typeof parsed.iconUrl === "string" && (parsed.iconUrl === "" || isSafeImageUrl(parsed.iconUrl))) theme.iconUrl = parsed.iconUrl;
    const size = Number(parsed.iconSize);
    if (size >= 32 && size <= 96) theme.iconSize = Math.round(size);
    return theme;
  } catch {
    return theme;
  }
}

export function loginBackgroundStyle(theme: LoginTheme): Record<string, string> {
  if (theme.backgroundMode === "image" && theme.imageUrl) {
    return {
      backgroundColor: theme.backgroundColor,
      backgroundImage: `url("${theme.imageUrl.replace(/["\\]/g, "")}")`,
      backgroundSize: theme.imageFit,
      backgroundPosition: theme.imagePosition,
      backgroundRepeat: "no-repeat",
    };
  }
  return {
    backgroundColor: theme.backgroundColor || "#f6f6f4",
    backgroundImage: "none",
  };
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function isSafeImageUrl(value: string) {
  if (value.startsWith("/realms/") && !value.includes("..")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}
