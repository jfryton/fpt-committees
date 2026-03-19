import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";

export function PwaControls() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installable, setInstallable] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW();

  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);

  const onInstall = async () => {
    if (!deferredPrompt) {
      return;
    }
    const promptEvent = deferredPrompt as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setInstallable(false);
    setDeferredPrompt(null);
  };

  return (
    <div className="row">
      {installable ? (
        <Button variant="secondary" onClick={() => void onInstall()}>
          {t.install}
        </Button>
      ) : null}
      {needRefresh ? (
        <div className="row alert">
          <span>{t.updateReady}</span>
          <Button
            variant="primary"
            onClick={() => {
              void updateServiceWorker(true);
              setNeedRefresh(false);
            }}
          >
            {t.applyUpdate}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
