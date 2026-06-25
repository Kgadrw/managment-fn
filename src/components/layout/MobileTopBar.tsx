import { useEffect, useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { clearTokens } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

function initialsFromName(name: string) {
  const parts = name
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((p) => p[0]!.toUpperCase()).join("") || "U";
}

function fallbackNameFromEmail(email: string) {
  const s = email.split("@")[0] || "";
  return s.replace(/[._-]+/g, " ").trim();
}

export function MobileTopBar() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api.get<{ id: string; email: string }>("/api/me");
        if (mounted && typeof me?.email === "string") setEmail(me.email);
      } catch {
        // ignore
      }
      try {
        const p = await api.get<{ name: string; avatarUrl: string }>("/api/profile");
        if (!mounted) return;
        if (typeof p?.name === "string") setName(p.name);
        if (typeof p?.avatarUrl === "string") setAvatarUrl(p.avatarUrl);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const displayName = useMemo(() => {
    const n = name.trim();
    if (n) return n;
    const e = email.trim();
    if (e) return fallbackNameFromEmail(e);
    return "there";
  }, [name, email]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="text-xs font-semibold">{initialsFromName(displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground leading-4">Hello</p>
            <p className="text-sm font-semibold truncate leading-5">{displayName}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            clearTokens();
            navigate("/login", { replace: true });
          }}
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
      <div className="h-px bg-border" />
    </header>
  );
}

