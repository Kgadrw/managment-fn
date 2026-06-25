import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Loader2, Mail, UserMinus, UserPlus, XCircle } from "lucide-react";
import { useBoardStore } from "@/store/useBoardStore";
import { KanbanBoard } from "@/components/boards/KanbanBoard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BoardCard, BoardInviteResponse } from "@/types/board";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function initials(email: string) {
  return (email.split("@")[0] ?? "?").slice(0, 2).toUpperCase();
}

function boardInviteStatusMessage(res: BoardInviteResponse) {
  if (res.kind === "added") {
    return { ok: true, text: `${res.member?.email ?? "User"} added to this board.` };
  }
  if (res.email.sent) {
    return { ok: true, text: `Email sent. They only get access to this board.` };
  }
  if (!res.smtpConfigured && !res.email.attempted) {
    return { ok: false, text: "Email not configured — copy the invite link below." };
  }
  if (res.email.error) {
    return { ok: false, text: res.email.error };
  }
  return { ok: false, text: "Copy the invite link below." };
}

export default function BoardDetailPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const {
    boardFull,
    isLoading,
    error,
    loadBoard,
    createCard,
    moveCard,
    updateCard,
    deleteCard,
    inviteToBoard,
    removeBoardMember,
  } = useBoardStore();
  const [editing, setEditing] = useState<BoardCard | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<BoardInviteResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeUserId: "" as string | null,
    dueDate: "",
    priority: "medium" as BoardCard["priority"],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (boardId) void loadBoard(boardId);
  }, [boardId, loadBoard]);

  useEffect(() => {
    void api
      .get<{ id: string; email: string }>("/api/me")
      .then((me) => setCurrentUserId(me.id))
      .catch(() => setCurrentUserId(null));
  }, []);

  const myBoardRole = useMemo(() => {
    if (!boardFull || !currentUserId) return null;
    return boardFull.members.find((m) => m.userId === currentUserId)?.role ?? null;
  }, [boardFull, currentUserId]);

  const canManageMembers = myBoardRole === "owner";

  const cardCount = boardFull?.cards.length ?? 0;

  const openCard = (card: BoardCard) => {
    setEditing(card);
    setForm({
      title: card.title,
      description: card.description,
      assigneeUserId: card.assigneeUserId ?? "",
      dueDate: card.dueDate?.slice(0, 10) ?? "",
      priority: card.priority,
    });
  };

  const saveCard = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateCard(editing.id, {
        title: form.title,
        description: form.description,
        assigneeUserId: form.assigneeUserId || null,
        dueDate: form.dueDate || null,
        priority: form.priority,
      });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!boardId || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await inviteToBoard(boardId, inviteEmail.trim());
      if (!res) return;
      setInviteResult(res);
      if (res.kind === "added") {
        void loadBoard(boardId);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  const closeInviteDialog = (open: boolean) => {
    setInviteOpen(open);
    if (!open) {
      setInviteResult(null);
      setInviteEmail("");
      setCopied(false);
    }
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleRemoveMember = async (userId: string, email: string) => {
    if (!boardId || !confirm(`Remove ${email} from this board?`)) return;
    try {
      await removeBoardMember(boardId, userId);
      toast.success("Member removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove member");
    }
  };

  if (!boardFull && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-muted-foreground">Loading board…</p>
      </div>
    );
  }

  if (!boardFull) {
    return (
      <div className="p-4">
        <p className="text-destructive">{error || "Board not found"}</p>
        <Button variant="link" asChild className="px-0 mt-2">
          <Link to="/boards">Back to boards</Link>
        </Button>
      </div>
    );
  }

  const isPersonal = boardFull.members.length <= 1;

  return (
    <div className="space-y-4 animate-fade-in flex flex-col min-h-[calc(100vh-5rem)] -mx-1 sm:-mx-2">
      <div className="flex items-center justify-between gap-4 shrink-0 px-1">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
            <Link to="/boards">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight truncate">{boardFull.board.title}</h1>
            <p className="text-xs text-muted-foreground">
              {cardCount} card{cardCount === 1 ? "" : "s"}
              {isPersonal ? " · Personal" : ` · ${boardFull.members.length} members`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canManageMembers && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-sm hidden sm:inline-flex"
              onClick={() => setInviteOpen(true)}
            >
              <Mail className="h-3.5 w-3.5" />
              Invite
            </Button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMembersOpen((o) => !o)}
              className="flex items-center -space-x-2 hover:opacity-90 transition-opacity rounded-md px-1 py-1"
              title="Board members"
            >
              {boardFull.members.slice(0, 4).map((m) => (
                <span
                  key={m.id}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold",
                    m.userId === currentUserId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {initials(m.email)}
                </span>
              ))}
              {boardFull.members.length > 4 && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
                  +{boardFull.members.length - 4}
                </span>
              )}
            </button>

            {membersOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMembersOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border bg-popover shadow-lg p-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Board members
                    </p>
                    {canManageMembers && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 px-2"
                        onClick={() => {
                          setMembersOpen(false);
                          setInviteOpen(true);
                        }}
                      >
                        <UserPlus className="h-3 w-3" />
                        Invite
                      </Button>
                    )}
                  </div>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {boardFull.members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold">
                            {initials(m.email)}
                          </span>
                          <span className="text-xs truncate">
                            {m.email.split("@")[0]}
                            {m.userId === currentUserId && (
                              <span className="text-muted-foreground ml-1">(you)</span>
                            )}
                          </span>
                        </div>
                        {canManageMembers && m.role !== "owner" && (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive p-0.5"
                            onClick={() => void handleRemoveMember(m.userId, m.email)}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <KanbanBoard
          lists={boardFull.lists}
          cards={boardFull.cards}
          members={boardFull.members}
          onCardClick={openCard}
          onAddCard={(listId, title) => void createCard(listId, title)}
          onMoveCard={(cardId, listId, sortOrder) => void moveCard(cardId, listId, sortOrder)}
        />
      </div>

      <Dialog open={inviteOpen} onOpenChange={closeInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{inviteResult ? "Invitation ready" : "Invite to this board"}</DialogTitle>
          </DialogHeader>

          {inviteResult ? (
            <div className="space-y-4">
              {(() => {
                const status = boardInviteStatusMessage(inviteResult);
                return (
                  <div className="flex items-start gap-3 rounded-sm border bg-muted/40 p-3">
                    {status.ok ? (
                      <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {inviteResult.kind === "added"
                          ? "Added to board"
                          : `Invited ${inviteResult.invite?.email}`}
                      </p>
                      <p className={cn("text-xs mt-1", status.ok ? "text-muted-foreground" : "text-amber-800")}>
                        {status.text}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {inviteResult.link && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Board invite link</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteResult.link} className="text-xs font-mono" />
                    <Button type="button" variant="outline" size="icon" onClick={() => void copyLink(inviteResult.link!)}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={() => closeInviteDialog(false)}>
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                They will only see <strong>{boardFull.board.title}</strong>, not your other boards.
              </p>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  autoFocus
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !inviting) void handleInvite();
                  }}
                />
              </div>
              <Button className="w-full gap-2" disabled={inviting || !inviteEmail.trim()} onClick={() => void handleInvite()}>
                {inviting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send board invite
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit card</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assignee</Label>
                <Select
                  value={form.assigneeUserId || "none"}
                  onValueChange={(v) => setForm({ ...form, assigneeUserId: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {boardFull.members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as BoardCard["priority"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" disabled={saving} onClick={() => void saveCard()}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (editing && confirm("Delete this card?")) {
                    void deleteCard(editing.id);
                    setEditing(null);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
