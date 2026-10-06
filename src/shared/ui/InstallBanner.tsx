"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "akurashi.installBannerDismissed";

// iOS Safari n'a pas d'invite d'installation automatique (brief §2) :
// bannière maison, visible seulement dans Safari et tant que l'app n'est pas
// installée sur l'écran d'accueil.
function shouldShow(): boolean {
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  let dismissed = false;
  try {
    dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // ignoré
  }
  return isIos && !isStandalone && !dismissed;
}

export function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(shouldShow()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignoré
    }
    setVisible(false);
  };

  return (
    <div
      style={{
        background: "var(--fa-tint)",
        borderRadius: "22px 12px 20px 14px",
        padding: "12px 16px",
        marginBottom: 16,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ flex: 1 }}>
        Pour installer l&rsquo;app : touche <strong>Partager</strong>, puis <strong>Sur l&rsquo;écran d&rsquo;accueil</strong>.
      </span>
      <button
        onClick={dismiss}
        style={{ border: "none", background: "none", color: "var(--fa-accent-fg)", font: "inherit", cursor: "pointer" }}
      >
        OK
      </button>
    </div>
  );
}
