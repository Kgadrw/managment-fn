import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  getCurrencyDisplayMode,
  getUsdToFrwRate,
  setCurrencyDisplayMode,
  setUsdToFrwRate,
  type CurrencyDisplayMode,
} from "@/utils/currency";
import { useCurrencyDisplay } from "@/hooks/useCurrencyDisplay";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { clearTokens, getRefreshToken } from "@/lib/auth";
import { LoadingState } from "@/components/shared/LoadingState";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [reminderAlerts, setReminderAlerts] = useState(true);
  const [overdueAlerts, setOverdueAlerts] = useState(true);
  const [renewalReminder, setRenewalReminder] = useState("7");
  const [usdToFrwRate, setUsdToFrwRateState] = useState(() => String(getUsdToFrwRate()));
  const [currencyDisplay, setCurrencyDisplayState] = useState<CurrencyDisplayMode>(() => getCurrencyDisplayMode());
  useCurrencyDisplay();
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileRole, setProfileRole] = useState("Owner");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [credsOpen, setCredsOpen] = useState(false);
  const [credsSaving, setCredsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newLoginEmail, setNewLoginEmail] = useState("");
  const [newLoginPassword, setNewLoginPassword] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const profile = {
    name: profileName,
    role: profileRole,
    email: loginEmail,
    company: companyName,
    avatarUrl: profileAvatarUrl,
  };
  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]!.toUpperCase())
    .join("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        try {
          const cfg = await api.get<{ usdToFrwRate?: number }>("/api/config");
          const rate = cfg?.usdToFrwRate;
          if (mounted && typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
            setUsdToFrwRate(rate);
            setUsdToFrwRateState(String(rate));
          }
        } catch {
          // Keep local cached rate if server isn't reachable.
        }

        try {
          const me = await api.get<{ id: string; email: string }>("/api/me");
          if (mounted && typeof me?.email === "string") setLoginEmail(me.email);
        } catch {
          // ignore
        }

        try {
          const p = await api.get<{ name: string; role: string; company: string; avatarUrl: string }>("/api/profile");
          if (!mounted) return;
          if (p?.name) setProfileName(p.name);
          if (typeof p?.role === "string") setProfileRole(p.role);
          if (typeof p?.avatarUrl === "string") setProfileAvatarUrl(p.avatarUrl);
          if (p?.company) setCompanyName(p.company);
        } catch {
          // Profile is optional; keep local defaults.
        }
      } finally {
        if (mounted) setIsInitialLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (isInitialLoading) {
    return <LoadingState message="Loading settings..." />;
  }

  const handleSaveProfile = async () => {
    const trimmedName = profileName.trim();
    const trimmedCompany = companyName.trim();
    if (!trimmedName) {
      toast.error("Please enter a name");
      return;
    }
    if (!trimmedCompany) {
      toast.error("Please enter a company name");
      return;
    }
    setProfileSaving(true);
    try {
      await api.put("/api/profile", {
        name: trimmedName,
        role: profileRole.trim(),
        company: trimmedCompany,
        avatarUrl: profileAvatarUrl.trim(),
      });
      toast.success("Profile updated");
      setProfileOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSignOut = () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      void api.post("/api/auth/logout", { refreshToken }).catch(() => {});
    }
    clearTokens();
    try {
      window.localStorage.removeItem("usd_to_frw_rate");
    } catch {
      // ignore
    }
    toast.success("Signed out");
    setSignOutOpen(false);
    navigate("/login");
  };

  const handleUpdateCredentials = async () => {
    const nextEmail = (newLoginEmail || loginEmail).trim();
    if (!currentPassword.trim()) {
      toast.error("Enter your current password");
      return;
    }
    if (!nextEmail) {
      toast.error("Enter a new email");
      return;
    }
    if (newLoginPassword.trim().length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setCredsSaving(true);
    try {
      await api.put("/api/me/credentials", {
        currentPassword: currentPassword.trim(),
        newEmail: nextEmail,
        newPassword: newLoginPassword.trim(),
      });
      toast.success("Login credentials updated. Please sign in again.");
      setCredsOpen(false);
      setCurrentPassword("");
      setNewLoginPassword("");
      setNewLoginEmail("");
      setLoginEmail(nextEmail);
      handleSignOut();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update credentials");
    } finally {
      setCredsSaving(false);
    }
  };

  const handleSave = async () => {
    const parsedRate = Number(usdToFrwRate);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      toast.error("Please enter a valid USD to FRW rate");
      return;
    }
    setSaving(true);
    try {
      await api.put("/api/settings/usd-to-frw-rate", { rate: parsedRate });
      setUsdToFrwRate(parsedRate);
      toast.success("Settings saved successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your workspace preferences</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_520px] items-start">
        <div className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">General</CardTitle>
              <CardDescription>Basic workspace information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="company">Company Name</Label>
                <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Display currency</Label>
                <Select
                  value={currencyDisplay}
                  onValueChange={(v) => {
                    const mode = v as CurrencyDisplayMode;
                    setCurrencyDisplayState(mode);
                    setCurrencyDisplayMode(mode);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rwf">RWF (default)</SelectItem>
                    <SelectItem value="usd">USD only</SelectItem>
                    <SelectItem value="both">Show both RWF and USD</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Enter amounts in RWF by default. The rate below is used for conversion and payer emails.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="usd-to-frw">USD to RWF exchange rate</Label>
                <Input
                  id="usd-to-frw"
                  type="number"
                  min="1"
                  value={usdToFrwRate}
                  onChange={(e) => setUsdToFrwRateState(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription>Configure how you receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Reminder Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified for upcoming reminders</p>
                </div>
                <Switch checked={reminderAlerts} onCheckedChange={setReminderAlerts} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Overdue Alerts</Label>
                  <p className="text-sm text-muted-foreground">Alert when rent or subscriptions are overdue</p>
                </div>
                <Switch checked={overdueAlerts} onCheckedChange={setOverdueAlerts} />
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label>Default Renewal Reminder (days before)</Label>
                <Select value={renewalReminder} onValueChange={setRenewalReminder}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>Your workspace identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={profile.name} /> : null}
                  <AvatarFallback>{initials || "U"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold leading-5 truncate">{profile.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{profile.role}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Company</span>
                  <span className="font-medium truncate">{profile.company}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Login</span>
                  <span className="font-medium truncate">{loginEmail || "—"}</span>
                </div>
              </div>

              <Separator />

              <div className="grid gap-2">
                <Button variant="outline" className="w-full" onClick={() => setProfileOpen(true)}>
                  Edit profile
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setCredsOpen(true)}>
                  Change login credentials
                </Button>
                <Button variant="ghost" className="w-full text-destructive" onClick={() => setSignOutOpen(true)}>
                  Sign out
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your profile information for this workspace.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input id="profile-name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-role">Role</Label>
              <Input id="profile-role" value={profileRole} onChange={(e) => setProfileRole(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-email">Login email</Label>
              <Input id="profile-email" type="email" value={loginEmail} readOnly />
              <p className="text-xs text-muted-foreground">Change this under “Change login credentials”.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-company">Company</Label>
              <Input id="profile-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-avatar">Avatar URL (optional)</Label>
              <Input id="profile-avatar" value={profileAvatarUrl} onChange={(e) => setProfileAvatarUrl(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveProfile()} disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={credsOpen} onOpenChange={setCredsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Change login credentials</DialogTitle>
            <DialogDescription>
              Update the admin email and password used to sign in. You will be signed out after saving.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-login-email">New login email</Label>
              <Input
                id="new-login-email"
                type="email"
                autoComplete="email"
                placeholder={loginEmail || "you@example.com"}
                value={newLoginEmail}
                onChange={(e) => setNewLoginEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-login-password">New password</Label>
              <Input
                id="new-login-password"
                type="password"
                autoComplete="new-password"
                value={newLoginPassword}
                onChange={(e) => setNewLoginPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleUpdateCredentials()} disabled={credsSaving}>
              {credsSaving ? "Saving..." : "Update credentials"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear local preferences on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleSignOut}>
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
