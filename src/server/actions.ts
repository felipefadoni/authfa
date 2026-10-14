"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isHexColor, isSafeImageUrl, parseLoginTheme, type LoginTheme } from "@/lib/login-theme";
import { z } from "zod";
import { CONSOLE_COOKIE, REALM_COOKIE, sessionCookieOptions } from "@/server/cookies";
import { readConsoleClaims, requireConsoleContext } from "@/server/console";
import {
  authenticateConsole,
  createClient,
  createGroup,
  createRealm,
  createRole,
  createSession,
  createUser,
  deleteClient,
  deleteGroup,
  deleteRole,
  deleteUser,
  DomainError,
  getClient,
  getLoginTheme,
  parseJsonList,
  recordEvent,
  regenerateSecret,
  revokeSession,
  saveLoginTheme,
  setUserEnabled,
  updateClient,
  updateRealm,
  updateUser,
} from "@/server/directory";
import { activeSession } from "@/server/directory";
import { signSessionToken } from "@/server/token-cookie";

async function requestIp() {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}

async function requestAgent() {
  const headerStore = await headers();
  return headerStore.get("user-agent") ?? "";
}

function bail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function readIds(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function readRedirects(value: FormDataEntryValue | null) {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { error: "Informe ao menos uma redirect URI." };
  for (const line of lines) {
    try {
      const url = new URL(line);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { error: "As redirect URIs precisam usar http ou https." };
      }
    } catch {
      return { error: `Redirect URI inválida: ${line}` };
    }
  }
  return { uris: lines };
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));
  const ip = await requestIp();
  const result = await authenticateConsole(username, password, ip);
  if ("error" in result) bail(`/login?next=${encodeURIComponent(next)}`, result.error ?? "Usuário ou senha inválidos.");

  const session = await createSession({
    userId: result.user.id,
    realmId: result.realm.id,
    ip,
    userAgent: await requestAgent(),
  });
  const token = await signSessionToken({
    sub: result.user.id,
    sid: session.id,
    realmId: result.realm.id,
    username: result.user.username,
    name: result.user.first_name,
  });
  const jar = await cookies();
  jar.set(CONSOLE_COOKIE, token, sessionCookieOptions);
  jar.set(REALM_COOKIE, result.realm.name, sessionCookieOptions);
  redirect(next);
}

export async function logoutAction() {
  const claims = await readConsoleClaims();
  const jar = await cookies();
  if (claims) {
    const session = await activeSession(claims.sid);
    if (session) {
      await revokeSession(claims.realmId, claims.sub, claims.sid, await requestIp());
      await recordEvent({ realmId: claims.realmId, type: "LOGOUT", userId: claims.sub, details: "console", ip: await requestIp() });
    }
  }
  jar.delete(CONSOLE_COOKIE);
  redirect("/login");
}

export async function createRealmAction(formData: FormData) {
  const context = await requireConsoleContext();
  if (!context.systemAdmin) bail("/", "Só o administrador do sistema cria realms.");

  const parsed = z
    .object({
      name: z.string().regex(/^[a-z][a-z0-9-]{1,62}$/, "Use letras minúsculas, números e hífen."),
      displayName: z.string().min(1).max(80),
    })
    .safeParse({
      name: String(formData.get("name") ?? "").trim(),
      displayName: String(formData.get("displayName") ?? "").trim(),
    });
  if (!parsed.success) bail("/realms/new", parsed.error.issues[0]?.message ?? "Dados inválidos.");

  try {
    const realm = await createRealm({
      actorId: context.user.id,
      name: parsed.data.name,
      displayName: parsed.data.displayName,
      ip: await requestIp(),
    });
    const jar = await cookies();
    jar.set(REALM_COOKIE, realm.name, sessionCookieOptions);
  } catch (error) {
    if (error instanceof DomainError) bail("/realms/new", error.message);
    throw error;
  }
  redirect("/");
}

export async function switchRealmAction(formData: FormData) {
  const context = await requireConsoleContext();
  const name = String(formData.get("realm") ?? "");
  if (!context.realms.some((realm) => realm.name === name)) {
    bail("/", "Você não administra esse realm.");
  }
  const jar = await cookies();
  jar.set(REALM_COOKIE, name, sessionCookieOptions);
  redirect("/");
}

export async function createUserAction(formData: FormData) {
  const context = await requireConsoleContext();
  const parsed = z
    .object({
      username: z.string().regex(/^[a-zA-Z0-9._-]{2,64}$/, "Use letras, números, ponto, _ ou -."),
      email: z.email("E-mail inválido."),
      firstName: z.string().min(1).max(80),
      lastName: z.string().min(1).max(80),
      password: z.string().min(8, "A senha precisa de 8 caracteres.").max(128),
    })
    .safeParse({
      username: String(formData.get("username") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    });
  if (!parsed.success) bail("/users/new", parsed.error.issues[0]?.message ?? "Dados inválidos.");

  try {
    await createUser({
      realmId: context.realm.id,
      actorId: context.user.id,
      username: parsed.data.username,
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      password: parsed.data.password,
      temporary: formData.get("temporary") === "on",
      enabled: formData.get("enabled") === "on",
      roleIds: readIds(formData, "roleIds"),
      groupIds: readIds(formData, "groupIds"),
      ip: await requestIp(),
    });
  } catch (error) {
    if (error instanceof DomainError) bail("/users/new", error.message);
    throw error;
  }
  redirect("/users");
}

export async function updateUserAction(formData: FormData) {
  const context = await requireConsoleContext();
  const userId = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  const parsed = z
    .object({
      email: z.email("E-mail inválido."),
      firstName: z.string().min(1).max(80),
      lastName: z.string().min(1).max(80),
      password: z.string().max(128),
    })
    .safeParse({
      email: String(formData.get("email") ?? "").trim(),
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      password,
    });
  if (!parsed.success) bail(`/users/${userId}`, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  if (password && password.length < 8) bail(`/users/${userId}`, "A senha precisa de 8 caracteres.");

  try {
    await updateUser({
      realmId: context.realm.id,
      actorId: context.user.id,
      userId,
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      enabled: formData.get("enabled") === "on",
      password: password || undefined,
      roleIds: readIds(formData, "roleIds"),
      groupIds: readIds(formData, "groupIds"),
      ip: await requestIp(),
    });
  } catch (error) {
    if (error instanceof DomainError) bail(`/users/${userId}`, error.message);
    throw error;
  }
  redirect(`/users/${userId}?saved=1`);
}

export async function setUserEnabledAction(formData: FormData) {
  const context = await requireConsoleContext();
  const userId = String(formData.get("id") ?? "");
  try {
    await setUserEnabled(context.realm.id, context.user.id, userId, formData.get("enabled") === "1", await requestIp());
  } catch (error) {
    if (error instanceof DomainError) bail("/users", error.message);
    throw error;
  }
  redirect("/users");
}

export async function deleteUserAction(formData: FormData) {
  const context = await requireConsoleContext();
  try {
    await deleteUser(context.realm.id, context.user.id, String(formData.get("id") ?? ""), await requestIp());
  } catch (error) {
    if (error instanceof DomainError) bail("/users", error.message);
    throw error;
  }
  redirect("/users");
}

export async function createClientAction(formData: FormData) {
  const context = await requireConsoleContext();
  const redirects = readRedirects(formData.get("redirectUris"));
  if ("error" in redirects) bail("/clients/new", redirects.error ?? "Redirect URI inválida.");
  const parsed = z
    .object({
      clientId: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/, "O client id usa letras minúsculas, números e hífen."),
      name: z.string().min(1).max(80),
      description: z.string().max(240),
    })
    .safeParse({
      clientId: String(formData.get("clientId") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
    });
  if (!parsed.success) bail("/clients/new", parsed.error.issues[0]?.message ?? "Dados inválidos.");

  try {
    const id = await createClient({
      realmId: context.realm.id,
      actorId: context.user.id,
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      description: parsed.data.description,
      publicClient: formData.get("publicClient") === "on",
      redirectUris: redirects.uris ?? [],
      ip: await requestIp(),
    });
    redirect(`/clients/${id}`);
  } catch (error) {
    if (error instanceof DomainError) bail("/clients/new", error.message);
    throw error;
  }
}

export async function updateClientAction(formData: FormData) {
  const context = await requireConsoleContext();
  const id = String(formData.get("id") ?? "");
  const redirects = readRedirects(formData.get("redirectUris"));
  if ("error" in redirects) bail(`/clients/${id}`, redirects.error ?? "Redirect URI inválida.");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) bail(`/clients/${id}`, "Informe o nome.");
  try {
    await updateClient({
      realmId: context.realm.id,
      actorId: context.user.id,
      id,
      name,
      description: String(formData.get("description") ?? "").trim(),
      redirectUris: redirects.uris ?? [],
      enabled: formData.get("enabled") === "on",
      standardFlow: formData.get("standardFlow") === "on",
      ip: await requestIp(),
    });
  } catch (error) {
    if (error instanceof DomainError) bail(`/clients/${id}`, error.message);
    throw error;
  }
  redirect(`/clients/${id}?saved=1`);
}

export async function regenerateSecretAction(formData: FormData) {
  const context = await requireConsoleContext();
  const id = String(formData.get("id") ?? "");
  try {
    await regenerateSecret(context.realm.id, context.user.id, id, await requestIp());
  } catch (error) {
    if (error instanceof DomainError) bail(`/clients/${id}`, error.message);
    throw error;
  }
  redirect(`/clients/${id}?saved=1`);
}

export async function deleteClientAction(formData: FormData) {
  const context = await requireConsoleContext();
  try {
    await deleteClient(context.realm.id, context.user.id, String(formData.get("id") ?? ""), await requestIp());
  } catch (error) {
    if (error instanceof DomainError) bail("/clients", error.message);
    throw error;
  }
  redirect("/clients");
}

export async function createRoleAction(formData: FormData) {
  const context = await requireConsoleContext();
  const parsed = z
    .object({
      name: z.string().regex(/^[a-zA-Z0-9._-]{2,64}$/, "Use letras, números, ponto, _ ou -."),
      description: z.string().max(240),
    })
    .safeParse({
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
    });
  if (!parsed.success) bail("/roles/new", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  try {
    const id = await createRole({
      realmId: context.realm.id,
      actorId: context.user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      ip: await requestIp(),
    });
    redirect(`/roles/${id}`);
  } catch (error) {
    if (error instanceof DomainError) bail("/roles/new", error.message);
    throw error;
  }
}

export async function deleteRoleAction(formData: FormData) {
  const context = await requireConsoleContext();
  try {
    await deleteRole(context.realm.id, context.user.id, String(formData.get("id") ?? ""), await requestIp());
  } catch (error) {
    if (error instanceof DomainError) bail("/roles", error.message);
    throw error;
  }
  redirect("/roles");
}

export async function createGroupAction(formData: FormData) {
  const context = await requireConsoleContext();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) bail("/groups/new", "O grupo precisa de um nome.");
  try {
    const id = await createGroup({
      realmId: context.realm.id,
      actorId: context.user.id,
      name,
      description: String(formData.get("description") ?? "").trim(),
      ip: await requestIp(),
    });
    redirect(`/groups/${id}`);
  } catch (error) {
    if (error instanceof DomainError) bail("/groups/new", error.message);
    throw error;
  }
}

export async function deleteGroupAction(formData: FormData) {
  const context = await requireConsoleContext();
  try {
    await deleteGroup(context.realm.id, context.user.id, String(formData.get("id") ?? ""), await requestIp());
  } catch (error) {
    if (error instanceof DomainError) bail("/groups", error.message);
    throw error;
  }
  redirect("/groups");
}

export async function revokeSessionAction(formData: FormData) {
  const context = await requireConsoleContext();
  const sessionId = String(formData.get("id") ?? "");
  try {
    await revokeSession(context.realm.id, context.user.id, sessionId, await requestIp());
  } catch (error) {
    if (error instanceof DomainError) bail("/sessions", error.message);
    throw error;
  }
  if (sessionId === context.claims.sid) {
    const jar = await cookies();
    jar.delete(CONSOLE_COOKIE);
    redirect("/login");
  }
  redirect("/sessions");
}

export async function saveLoginThemeAction(formData: FormData) {
  const context = await requireConsoleContext();
  const current = await getLoginTheme(context.realm.id);
  const backgroundMode = String(formData.get("backgroundMode") ?? "color");
  const backgroundColor = String(formData.get("backgroundColor") ?? "");
  const pastedUrl = String(formData.get("imageUrl") ?? "").trim();
  const upload = formData.get("image");
  let imageUrl = current.imageUrl;

  const iconUpload = formData.get("icon");
  const iconLink = String(formData.get("iconUrl") ?? "").trim();
  const removeIcon = formData.get("removeIcon") === "on";
  let iconUrl = current.iconUrl;

  if (removeIcon) {
    iconUrl = "";
  } else if (iconUpload instanceof File && iconUpload.size > 0) {
    if (iconUpload.type !== "image/png") bail("/login-screen", "O ícone precisa ser um arquivo PNG.");
    if (iconUpload.size > 2_000_000) bail("/login-screen", "O ícone precisa ter no máximo 2 MB.");
    const { saveLoginAsset } = await import("@/server/login-background");
    await saveLoginAsset(context.realm.id, "icon", Buffer.from(await iconUpload.arrayBuffer()), iconUpload.type);
    iconUrl = `/realms/${context.realm.name}/login-icon?v=${Date.now()}`;
  } else if (iconLink && iconLink !== current.iconUrl) {
    if (!isSafeImageUrl(iconLink)) bail("/login-screen", "A URL do ícone precisa começar com http ou https.");
    iconUrl = iconLink;
  }

  if (!isHexColor(backgroundColor)) bail("/login-screen", "Escolha uma cor em hexadecimal, como #2f6bf3.");

  if (upload instanceof File && upload.size > 0) {
    const mime = upload.type;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mime)) {
      bail("/login-screen", "Use uma imagem PNG, JPEG, WebP ou GIF.");
    }
    if (upload.size > 2_000_000) bail("/login-screen", "A imagem precisa ter no máximo 2 MB.");
    const { saveLoginBackground } = await import("@/server/login-background");
    await saveLoginBackground(context.realm.id, Buffer.from(await upload.arrayBuffer()), mime);
    imageUrl = `/realms/${context.realm.name}/login-background?v=${Date.now()}`;
  } else if (pastedUrl && pastedUrl !== current.imageUrl) {
    if (!isSafeImageUrl(pastedUrl)) bail("/login-screen", "A URL da imagem precisa começar com http ou https.");
    imageUrl = pastedUrl;
  }

  if (backgroundMode === "image" && !imageUrl) {
    bail("/login-screen", "Envie uma imagem ou informe a URL dela.");
  }

  const theme: LoginTheme = parseLoginTheme(
    JSON.stringify({
      backgroundMode: backgroundMode === "image" ? "image" : "color",
      backgroundColor,
      imageUrl,
      imageFit: String(formData.get("imageFit") ?? "cover"),
      imagePosition: String(formData.get("imagePosition") ?? "center"),
      title: String(formData.get("title") ?? ""),
      subtitle: String(formData.get("subtitle") ?? ""),
      buttonLabel: String(formData.get("buttonLabel") ?? ""),
      usernameLabel: String(formData.get("usernameLabel") ?? ""),
      passwordLabel: String(formData.get("passwordLabel") ?? ""),
      iconUrl,
      iconSize: Number(formData.get("iconSize") ?? 48),
    }),
  );

  await saveLoginTheme(context.realm.id, context.user.id, theme, await requestIp());
  redirect("/login-screen?saved=1");
}

export async function updateRealmAction(formData: FormData) {
  const context = await requireConsoleContext();
  const parsed = z
    .object({
      displayName: z.string().min(1).max(80),
      accessTokenTtl: z.number().int().min(60).max(86_400),
    })
    .safeParse({
      displayName: String(formData.get("displayName") ?? "").trim(),
      accessTokenTtl: Number(formData.get("accessTokenTtl")),
    });
  if (!parsed.success) bail("/settings", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  await updateRealm(context.realm.id, context.user.id, parsed.data.displayName, parsed.data.accessTokenTtl, await requestIp());
  redirect("/settings?saved=1");
}

export async function clientRedirects(realmId: string, id: string) {
  const client = await getClient(realmId, id);
  return client ? parseJsonList(client.redirect_uris) : [];
}

function safeNext(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/";
  return value;
}
