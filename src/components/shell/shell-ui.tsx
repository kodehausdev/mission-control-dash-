"use client";

/*
 * Client-side shell chrome: toasts, command-palette + notifications state,
 * and the global ⌘K / Esc keyboard handling. The palette and drawer render
 * here so every screen gets them for free.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface ShellUI {
  toast: (msg: string) => void;
  openCmd: () => void;
  closeCmd: () => void;
  toggleNotif: () => void;
  cmdOpen: boolean;
  notifOpen: boolean;
}

const Ctx = createContext<ShellUI | null>(null);

export function useShellUI(): ShellUI {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShellUI outside ShellUIProvider");
  return ctx;
}

export function ShellUIProvider({
  children,
  palette,
  drawer,
}: {
  children: React.ReactNode;
  /** Command palette content — rendered when open (task: command palette). */
  palette?: React.ReactNode;
  /** Notifications drawer content — rendered when open. */
  drawer?: React.ReactNode;
}) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
        setNotifOpen(false);
      } else if (e.key === "Escape") {
        setCmdOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider
      value={{
        toast,
        openCmd: () => setCmdOpen(true),
        closeCmd: () => setCmdOpen(false),
        toggleNotif: () => {
          setNotifOpen((v) => !v);
          setCmdOpen(false);
        },
        cmdOpen,
        notifOpen,
      }}
    >
      {children}

      {cmdOpen && palette}
      {notifOpen && drawer}

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 z-80 flex -translate-x-1/2 items-center gap-[9px] rounded-[10px] border border-white/10 bg-toast px-4 py-[10px] shadow-[0_10px_34px_rgba(0,0,0,.5)]">
          <span className="h-[7px] w-[7px] rounded-full bg-green" />
          <span className="text-[12.5px] font-medium">{toastMsg}</span>
        </div>
      )}
    </Ctx.Provider>
  );
}
