import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BoardCard, BoardList, BoardMember } from "@/types/board";

const priorityStyles: Record<BoardCard["priority"], { border: string; dot: string }> = {
  low: { border: "border-l-sky-400", dot: "bg-sky-400" },
  medium: { border: "border-l-emerald-400", dot: "bg-emerald-400" },
  high: { border: "border-l-amber-400", dot: "bg-amber-400" },
  urgent: { border: "border-l-rose-500", dot: "bg-rose-500" },
};

const columnTints = [
  "from-slate-500/8 to-transparent",
  "from-violet-500/10 to-transparent",
  "from-emerald-500/10 to-transparent",
];

function initials(email: string) {
  const part = email.split("@")[0] ?? "?";
  return part.slice(0, 2).toUpperCase();
}

type Props = {
  lists: BoardList[];
  cards: BoardCard[];
  members: BoardMember[];
  onCardClick: (card: BoardCard) => void;
  onAddCard: (listId: string, title: string) => void;
  onMoveCard: (cardId: string, listId: string, sortOrder: number) => void;
};

function normalizeSortOrders(cards: BoardCard[], listId: string) {
  const inList = cards.filter((c) => c.listId === listId).sort((a, b) => a.sortOrder - b.sortOrder);
  return cards.map((c) => {
    if (c.listId !== listId) return c;
    const idx = inList.findIndex((x) => x.id === c.id);
    return { ...c, sortOrder: idx >= 0 ? idx : c.sortOrder };
  });
}

function KanbanCardContent({
  card,
  members,
  isOverlay,
}: {
  card: BoardCard;
  members: BoardMember[];
  isOverlay?: boolean;
}) {
  const assignee = card.assigneeUserId
    ? members.find((m) => m.userId === card.assigneeUserId)
    : null;
  const p = priorityStyles[card.priority];

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card/95 backdrop-blur-sm border-l-[3px] text-left w-full",
        "shadow-sm hover:shadow-md transition-shadow duration-200",
        p.border,
        isOverlay ? "p-3.5 shadow-xl ring-2 ring-primary/25 rotate-1 scale-[1.03]" : "p-3",
      )}
    >
      <p className={cn("font-medium leading-snug text-foreground", isOverlay ? "text-sm" : "text-[13px]")}>
        {card.title}
      </p>
      {(assignee || card.dueDate) && (
        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-border/60">
          {assignee ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                {initials(assignee.email)}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {assignee.email.split("@")[0]}
              </span>
            </div>
          ) : (
            <span />
          )}
          {card.dueDate && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
              <Calendar className="h-3 w-3" />
              {card.dueDate.slice(5, 10)}
            </span>
          )}
        </div>
      )}
      <span className={cn("absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full", p.dot)} title={card.priority} />
    </div>
  );
}

function SortableCard({
  card,
  members,
  onCardClick,
}: {
  card: BoardCard;
  members: BoardMember[];
  onCardClick: (card: BoardCard) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card, listId: card.listId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("touch-none", isDragging && "opacity-30 scale-[0.98]")}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        onClick={() => onCardClick(card)}
        className="w-full text-left cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
      >
        <KanbanCardContent card={card} members={members} />
      </button>
    </div>
  );
}

function KanbanColumn({
  list,
  listIndex,
  cards,
  members,
  addingListId,
  newTitle,
  setNewTitle,
  setAddingListId,
  onCardClick,
  onAddCard,
}: {
  list: BoardList;
  listIndex: number;
  cards: BoardCard[];
  members: BoardMember[];
  addingListId: string | null;
  newTitle: string;
  setNewTitle: (v: string) => void;
  setAddingListId: (id: string | null) => void;
  onCardClick: (card: BoardCard) => void;
  onAddCard: (listId: string, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: { type: "column", listId: list.id },
  });

  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);
  const tint = columnTints[listIndex % columnTints.length];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[min(100%,17rem)] w-[17rem] sm:w-[18rem] shrink-0 flex flex-col",
        "rounded-lg border bg-gradient-to-b backdrop-blur-sm",
        tint,
        "max-h-[calc(100vh-120px)] min-h-[min(68vh,480px)] transition-all duration-200",
        isOver ? "border-primary/40 shadow-lg shadow-primary/5 bg-primary/[0.03]" : "border-border/80 bg-muted/20",
      )}
    >
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/60">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {list.title}
        </span>
        <span className="text-[10px] font-medium tabular-nums text-muted-foreground/80 bg-muted/60 px-1.5 py-0.5 rounded">
          {cards.length}
        </span>
      </div>

      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin min-h-[100px]">
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} members={members} onCardClick={onCardClick} />
          ))}

          {addingListId === list.id ? (
            <div className="space-y-2 pt-1">
              <Input
                autoFocus
                placeholder="Task title"
                className="h-9 text-sm rounded-md bg-background/80"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTitle.trim()) {
                    onAddCard(list.id, newTitle.trim());
                    setNewTitle("");
                    setAddingListId(null);
                  }
                  if (e.key === "Escape") setAddingListId(null);
                }}
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    if (newTitle.trim()) onAddCard(list.id, newTitle.trim());
                    setNewTitle("");
                    setAddingListId(null);
                  }}
                >
                  Add
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAddingListId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="w-full flex items-center gap-1.5 px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              onClick={() => {
                setAddingListId(list.id);
                setNewTitle("");
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add card
            </button>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ lists, cards, members, onCardClick, onAddCard, onMoveCard }: Props) {
  const [localCards, setLocalCards] = useState(cards);
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [addingListId, setAddingListId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    setLocalCards(cards);
  }, [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const cardsByList = useMemo(() => {
    const map = new Map<string, BoardCard[]>();
    for (const list of lists) {
      map.set(
        list.id,
        localCards.filter((c) => c.listId === list.id).sort((a, b) => a.sortOrder - b.sortOrder),
      );
    }
    return map;
  }, [lists, localCards]);

  const findListId = (cardId: string) => localCards.find((c) => c.id === cardId)?.listId;

  const handleDragStart = (event: DragStartEvent) => {
    const card = localCards.find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeListId = findListId(activeId);
    if (!activeListId) return;

    let overListId: string | undefined;
    if (lists.some((l) => l.id === overId)) {
      overListId = overId;
    } else {
      overListId = findListId(overId);
    }
    if (!overListId || activeListId === overListId) return;

    setLocalCards((prev) => {
      const activeIndex = prev.findIndex((c) => c.id === activeId);
      if (activeIndex < 0) return prev;

      const overCards = prev.filter((c) => c.listId === overListId).sort((a, b) => a.sortOrder - b.sortOrder);
      let overIndex = overCards.findIndex((c) => c.id === overId);
      if (overIndex < 0) overIndex = overCards.length;

      const next = [...prev];
      const [moved] = next.splice(activeIndex, 1);
      const inserted = { ...moved, listId: overListId };
      next.push(inserted);

      const targetIds = next.filter((c) => c.listId === overListId).sort((a, b) => a.sortOrder - b.sortOrder);
      const withoutTarget = next.filter((c) => c.listId !== overListId);
      const reordered = [...targetIds.filter((c) => c.id !== activeId)];
      reordered.splice(overIndex, 0, inserted);
      const normalized = reordered.map((c, i) => ({ ...c, sortOrder: i }));
      return normalizeSortOrders([...withoutTarget, ...normalized], overListId);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;

    const activeId = String(active.id);
    const activeListId = findListId(activeId);
    if (!activeListId) return;

    let overListId: string | undefined;
    const overId = String(over.id);
    if (lists.some((l) => l.id === overId)) {
      overListId = overId;
    } else {
      overListId = findListId(overId);
    }
    if (!overListId) return;

    setLocalCards((prev) => {
      const listCards = prev.filter((c) => c.listId === overListId).sort((a, b) => a.sortOrder - b.sortOrder);
      const activeIndex = listCards.findIndex((c) => c.id === activeId);
      const overIndex = listCards.findIndex((c) => c.id === overId);

      let next = prev;
      if (activeListId === overListId && overIndex >= 0 && activeIndex >= 0 && activeIndex !== overIndex) {
        const reordered = arrayMove(listCards, activeIndex, overIndex);
        const others = prev.filter((c) => c.listId !== overListId);
        const withOrder = reordered.map((c, i) => ({ ...c, sortOrder: i }));
        next = [...others, ...withOrder];
      } else {
        next = normalizeSortOrders(prev, overListId);
      }

      const moved = next.find((c) => c.id === activeId);
      if (moved) {
        onMoveCard(activeId, moved.listId, moved.sortOrder);
      }
      return next;
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "relative rounded-xl border border-border/60 p-4 overflow-hidden",
          "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/50 via-background to-background",
        )}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_40%,transparent_100%)] pointer-events-none opacity-40" />

        <div className="relative flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin min-h-[min(70vh,520px)]">
          {lists.map((list, i) => (
            <KanbanColumn
              key={list.id}
              list={list}
              listIndex={i}
              cards={cardsByList.get(list.id) ?? []}
              members={members}
              addingListId={addingListId}
              newTitle={newTitle}
              setNewTitle={setNewTitle}
              setAddingListId={setAddingListId}
              onCardClick={onCardClick}
              onAddCard={onAddCard}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeCard ? (
          <div className="w-[17rem] sm:w-[18rem] cursor-grabbing">
            <KanbanCardContent card={activeCard} members={members} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
