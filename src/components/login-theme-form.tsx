"use client";

import { useState } from "react";
import { loginBackgroundStyle, type LoginTheme } from "@/lib/login-theme";
import { saveLoginThemeAction } from "@/server/actions";

export function LoginThemeForm({ theme }: { theme: LoginTheme }) {
  const [draft, setDraft] = useState(theme);
  const [previewImage, setPreviewImage] = useState("");
  const [previewIcon, setPreviewIcon] = useState("");
  const preview = {
    ...draft,
    imageUrl: previewImage || draft.imageUrl,
    iconUrl: previewIcon || draft.iconUrl,
  };
  const title = draft.title || "Entrar";
  const subtitle = draft.subtitle || "A aplicação pediu acesso à sua conta.";
  const buttonLabel = draft.buttonLabel || "Continuar";
  const usernameLabel = draft.usernameLabel || "Usuário";
  const passwordLabel = draft.passwordLabel || "Senha";

  function update(partial: Partial<LoginTheme>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  return (
    <div className="theme-layout">
      <form className="panel" action={saveLoginThemeAction}>
        <fieldset className="field">
          <span>Ícone</span>
          <label className="field">
            <span>PNG</span>
            <input
              name="icon"
              type="file"
              accept="image/png"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreviewIcon(file ? URL.createObjectURL(file) : "");
                if (file) update({ iconUrl: "preview" });
              }}
            />
          </label>
          <label className="field">
            <span>Ou URL do ícone</span>
            <input
              name="iconUrl"
              value={draft.iconUrl === "preview" ? "" : draft.iconUrl}
              placeholder="https://..."
              onChange={(event) => {
                setPreviewIcon("");
                update({ iconUrl: event.target.value });
              }}
            />
          </label>
          <label className="field">
            <span>Tamanho · {draft.iconSize}px</span>
            <input
              name="iconSize"
              type="range"
              min={32}
              max={96}
              value={draft.iconSize}
              onChange={(event) => update({ iconSize: Number(event.target.value) })}
            />
            <span className="icon-demo" style={{ width: draft.iconSize, height: draft.iconSize }}>
              {preview.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.iconUrl} alt="" />
              ) : (
                <i>vazio</i>
              )}
            </span>
          </label>
          {draft.iconUrl ? (
            <label className="check">
              <input
                type="checkbox"
                name="removeIcon"
                onChange={(event) => {
                  if (!event.target.checked) return;
                  setPreviewIcon("");
                  update({ iconUrl: "" });
                }}
              />
              Remover ícone
            </label>
          ) : null}
        </fieldset>
        <fieldset className="field">
          <span>Fundo</span>
          <div className="segment" role="radiogroup" aria-label="Fundo">
            <label className={draft.backgroundMode === "color" ? "is-on" : undefined}>
              <input
                type="radio"
                name="backgroundMode"
                value="color"
                checked={draft.backgroundMode === "color"}
                onChange={() => update({ backgroundMode: "color" })}
              />
              Cor
            </label>
            <label className={draft.backgroundMode === "image" ? "is-on" : undefined}>
              <input
                type="radio"
                name="backgroundMode"
                value="image"
                checked={draft.backgroundMode === "image"}
                onChange={() => update({ backgroundMode: "image" })}
              />
              Imagem
            </label>
          </div>
        </fieldset>
        <label className="field">
          <span>Cor do fundo</span>
          <input
            name="backgroundColor"
            type="color"
            value={draft.backgroundColor}
            onChange={(event) => update({ backgroundColor: event.target.value })}
          />
        </label>
        {draft.backgroundMode === "image" ? (
          <>
            <label className="field">
              <span>Imagem</span>
              <input
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setPreviewImage(file ? URL.createObjectURL(file) : "");
                }}
              />
            </label>
            <label className="field">
              <span>Ou URL da imagem</span>
              <input
                name="imageUrl"
                value={draft.imageUrl}
                placeholder="https://..."
                onChange={(event) => {
                  setPreviewImage("");
                  update({ imageUrl: event.target.value });
                }}
              />
            </label>
            <label className="field">
              <span>Ajuste da imagem</span>
              <select name="imageFit" value={draft.imageFit} onChange={(event) => update({ imageFit: event.target.value as LoginTheme["imageFit"] })}>
                <option value="cover">Preencher a tela</option>
                <option value="contain">Mostrar a imagem inteira</option>
              </select>
            </label>
            <label className="field">
              <span>Posição da imagem</span>
              <select
                name="imagePosition"
                value={draft.imagePosition}
                onChange={(event) => update({ imagePosition: event.target.value as LoginTheme["imagePosition"] })}
              >
                <option value="center">Centro</option>
                <option value="top">Topo</option>
                <option value="bottom">Base</option>
              </select>
            </label>
          </>
        ) : (
          <>
            <input type="hidden" name="imageUrl" value={draft.imageUrl} />
            <input type="hidden" name="imageFit" value={draft.imageFit} />
            <input type="hidden" name="imagePosition" value={draft.imagePosition} />
          </>
        )}
        <label className="field">
          <span>Título</span>
          <input name="title" value={draft.title} placeholder="Entrar" maxLength={80} onChange={(event) => update({ title: event.target.value })} />
        </label>
        <label className="field">
          <span>Subtítulo</span>
          <input
            name="subtitle"
            value={draft.subtitle}
            placeholder="A aplicação pediu acesso à sua conta."
            maxLength={160}
            onChange={(event) => update({ subtitle: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Texto do botão</span>
          <input
            name="buttonLabel"
            value={draft.buttonLabel}
            placeholder="Continuar"
            maxLength={40}
            onChange={(event) => update({ buttonLabel: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Label do usuário</span>
          <input
            name="usernameLabel"
            value={draft.usernameLabel}
            placeholder="Usuário"
            maxLength={40}
            onChange={(event) => update({ usernameLabel: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Label da senha</span>
          <input
            name="passwordLabel"
            value={draft.passwordLabel}
            placeholder="Senha"
            maxLength={40}
            onChange={(event) => update({ passwordLabel: event.target.value })}
          />
        </label>
        <button className="btn btn-primary" type="submit">
          Salvar tela
        </button>
      </form>
      <div className="stage stage-plain stage-preview" style={loginBackgroundStyle(preview)}>
        <section className="login-window">
          {preview.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="login-icon" src={preview.iconUrl} alt="" width={draft.iconSize} height={draft.iconSize} />
          ) : null}
          <h1 className="login-title-center">{title}</h1>
          <p className="lede">{subtitle}</p>
          <div className="panel" style={{ padding: 0, border: 0, boxShadow: "none", background: "transparent" }}>
            <label className="field">
              <span>{usernameLabel}</span>
              <input readOnly value="" />
            </label>
            <label className="field">
              <span>{passwordLabel}</span>
              <input readOnly type="password" value="" />
            </label>
            <button className="btn btn-primary" type="button">
              {buttonLabel}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
