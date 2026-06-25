import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid, Plus } from "lucide-react";
import { useBoardStore } from "@/store/useBoardStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const CARD_ACCENTS = [
  "border-t-violet-500",
  "border-t-sky-500",
  "border-t-emerald-500",
  "border-t-amber-500",
  "border-t-rose-500",
];

function formatRecent(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function BoardsPage() {
  const navigate = useNavigate();
  const { boards, isLoading, error, refreshWorkspace, createBoard } = useBoardStore();
  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const [boardTitle, setBoardTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void refreshWorkspace();
  }, [refreshWorkspace]);

  const handleCreateBoard = async () => {
    if (!boardTitle.trim()) return;
    setSaving(true);
    try {
      const board = await createBoard(boardTitle.trim());
      setNewBoardOpen(false);
      setBoardTitle("");
      if (board) navigate(`/boards/${board.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in py-1">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Recent boards</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Open a board or create a new one</p>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <Button size="sm" onClick={() => setNewBoardOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          New board
        </Button>
      </div>

      {isLoading && boards.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : boards.length === 0 ? (
        <div className="border border-dashed rounded-sm py-14 text-center">
          <LayoutGrid className="h-7 w-7 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium">No boards yet</p>
          <Button size="sm" variant="outline" className="mt-3 rounded-sm" onClick={() => setNewBoardOpen(true)}>
            Create board
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {boards.map((b, i) => {
            const personal = b.isPersonal ?? (b.memberCount ?? 1) <= 1;
            return (
              <Link
                key={b.id}
                to={`/boards/${b.id}`}
                className={cn(
                  "group block rounded-sm border bg-card border-t-[3px] px-3 py-2.5 min-h-[72px]",
                  "hover:bg-muted/30 hover:border-border/80 transition-colors",
                  CARD_ACCENTS[i % CARD_ACCENTS.length],
                )}
              >
                <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                  {b.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
                  {personal ? "Personal" : `${b.memberCount} members`}
                  <span className="mx-1">·</span>
                  {formatRecent(b.createdAt)}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={newBoardOpen} onOpenChange={setNewBoardOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New board</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Board name</Label>
              <Input value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} placeholder="e.g. Sprint board" />
            </div>
            <Button className="w-full" disabled={saving} onClick={() => void handleCreateBoard()}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
