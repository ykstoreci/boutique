import { describe, it, expect } from "vitest";
import { parseThemeSettings, parseSnapshot, DEFAULT_THEME_SETTINGS } from "../src/lib/theme/schema";
import { generateThemeCssVariables } from "../src/lib/theme/render";

describe("Validation et rendu du Thème", () => {
  it("applique les valeurs par défaut sûres si l'entrée est vide ou corrompue", () => {
    const settings = parseThemeSettings({});
    expect(settings.colors.primary).toBe("#111111");
    expect(settings.typography.baseSize).toBe(16);
    expect(settings.shape.buttonRadius).toBe(12);
  });

  it("génère des variables CSS valides à partir des réglages", () => {
    const css = generateThemeCssVariables(DEFAULT_THEME_SETTINGS);
    expect(css).toContain("--theme-primary: #111111;");
    expect(css).toContain("--theme-radius-btn: 12px;");
    expect(css).toContain("--theme-font-heading:");
  });

  it("parse un snapshot de sections sans perdre l'intégrité", () => {
    const snap = parseSnapshot({
      settings: DEFAULT_THEME_SETTINGS,
      sections: [
        { id: "sec-1", type: "hero", isEnabled: true, settings: { title: "Bienvenue" } },
        { id: "sec-2", type: "categories", isEnabled: false, settings: {} },
        { id: "sec-fake", type: "type_inconnu", isEnabled: true, settings: {} }, // Invalide, ignoré
      ],
    });

    expect(snap.sections.length).toBe(2);
    expect(snap.sections[0].type).toBe("hero");
    expect(snap.sections[1].type).toBe("categories");
    expect(snap.sections[1].isEnabled).toBe(false);
  });
});

