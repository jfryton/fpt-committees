import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { get, set } from "idb-keyval";

export type Locale = "en" | "fr";

type Messages = typeof messages.en;

const messages = {
  en: {
    appName: "FPT Committees",
    install: "Install app",
    updateReady: "Update available",
    applyUpdate: "Reload",
    language: "Lang",
    signOut: "Sign out",
    loading: "Loading",
    tokenLandingTitle: "Signing you in",
    tokenLandingSubtitle:
      "We are securely exchanging your access token and preparing your workspace.",
    tokenError: "The token was invalid or expired.",
    goDirectory: "Go to directory",
    bootstrapCta: "Set up admin access",
    bootstrapSubtitle: "No admin has finished setup yet. Use this one-time setup entry to initialize the workspace.",
    bootstrapError: "Bootstrap setup is no longer available.",
    directoryTitle: "Committee Directory",
    directorySubtitle: "Search, review mandates, and open records for editing.",
    searchPlaceholder: "Search by code, name, co-chair, or secretariat email",
    open: "Open",
    noCommittees: "No committee records found.",
    details: "Details",
    saveChanges: "Save changes",
    saving: "Saving...",
    saved: "Saved",
    adminTitle: "Grant Administration",
    adminSubtitle: "Create and revoke access grants for the committee directory.",
    createGrant: "Create grant",
    revoke: "Revoke",
    allCommittees: "All committees",
    selectedCommittees: "Selected committees",
    accessRole: "Access role",
    status: "Status",
    active: "Active",
    revoked: "Revoked",
    expiresAt: "Expires",
    never: "Never",
    authRequired: "Authentication required",
    authRequiredBody: "Use your secure access link to sign in.",
    viewer: "Viewer",
    editor: "Editor",
    admin: "Admin",
    directoryNav: "Directory",
    committeeNav: "Committee",
    adminNav: "Admin",
    create: "Create",
    displayName: "Display name",
    scope: "Scope",
    committeIds: "Committee IDs (comma separated)",
    close: "Close",
    latestAccessLink: "Latest access link",
    latestAccessLinkBody:
      "Distribute this link directly to the recipient. Revoking the grant will immediately stop access.",
    adminOnly: "Admin access is required for this screen."
  },
  fr: {
    appName: "Comites FPT",
    install: "Installer l'application",
    updateReady: "Mise a jour disponible",
    applyUpdate: "Recharger",
    language: "Langue",
    signOut: "Se deconnecter",
    loading: "Chargement",
    tokenLandingTitle: "Connexion en cours",
    tokenLandingSubtitle:
      "Nous echangeons votre jeton d'acces en toute securite et preparons votre espace.",
    tokenError: "Le jeton est invalide ou expire.",
    goDirectory: "Aller au repertoire",
    bootstrapCta: "Configurer l'acces admin",
    bootstrapSubtitle: "Aucun administrateur n'a encore termine la configuration. Utilisez cette entree unique pour initialiser l'espace.",
    bootstrapError: "L'initialisation n'est plus disponible.",
    directoryTitle: "Repertoire des comites",
    directorySubtitle:
      "Rechercher, consulter les mandats et ouvrir les dossiers pour modification.",
    searchPlaceholder:
      "Recherche par code, nom, copresident ou courriel du secretariat",
    open: "Ouvrir",
    noCommittees: "Aucun dossier de comite trouve.",
    details: "Details",
    saveChanges: "Enregistrer",
    saving: "Enregistrement...",
    saved: "Enregistre",
    adminTitle: "Administration des autorisations",
    adminSubtitle:
      "Creer et revoquer les acces pour le repertoire des comites.",
    createGrant: "Creer une autorisation",
    revoke: "Revoquer",
    allCommittees: "Tous les comites",
    selectedCommittees: "Comites selectionnes",
    accessRole: "Role d'acces",
    status: "Statut",
    active: "Actif",
    revoked: "Revoque",
    expiresAt: "Expiration",
    never: "Jamais",
    authRequired: "Authentification requise",
    authRequiredBody:
      "Utilisez votre lien d'acces securise pour ouvrir une session.",
    viewer: "Lecteur",
    editor: "Editeur",
    admin: "Administrateur",
    directoryNav: "Repertoire",
    committeeNav: "Comite",
    adminNav: "Admin",
    create: "Creer",
    displayName: "Nom affiche",
    scope: "Portee",
    committeIds: "IDs de comites (separes par des virgules)",
    close: "Fermer",
    latestAccessLink: "Dernier lien d'acces",
    latestAccessLinkBody:
      "Transmettez ce lien directement au destinataire. La revocation du droit coupera l'acces immediatement.",
    adminOnly: "Un acces administrateur est requis pour cet ecran."
  }
} satisfies Record<Locale, Record<string, string>>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const LOCALE_KEY = "fpt.locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    void get(LOCALE_KEY).then((stored) => {
      if (stored === "en" || stored === "fr") {
        setLocaleState(stored);
      }
    });
  }, []);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    void set(LOCALE_KEY, nextLocale);
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: messages[locale]
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }
  return context;
}
