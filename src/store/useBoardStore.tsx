import React, { createContext, useCallback, useContext, useState } from "react";
import type {
  Board,
  BoardCard,
  BoardFullPayload,
  BoardMember,
  BoardInviteResponse,
  Workspace,
  WorkspaceMember,
  WorkspaceMeResponse,
  WorkspaceRole,
} from "@/types/board";
import { api, LOCAL_API_URL } from "@/lib/api";

type BoardContextType = {
  workspace: Workspace | null;
  members: WorkspaceMember[];
  myRole: WorkspaceRole | null;
  boards: Board[];
  boardFull: BoardFullPayload | null;
  isLoading: boolean;
  error: string | null;
  refreshWorkspace: () => Promise<void>;
  loadBoard: (boardId: string) => Promise<void>;
  createBoard: (title: string) => Promise<Board | null>;
  createCard: (listId: string, title: string) => Promise<void>;
  moveCard: (cardId: string, listId: string, sortOrder: number) => Promise<void>;
  updateCard: (cardId: string, patch: Partial<BoardCard>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  inviteToBoard: (boardId: string, email: string) => Promise<BoardInviteResponse | null>;
  addBoardMember: (boardId: string, userId: string) => Promise<BoardMember | null>;
  removeBoardMember: (boardId: string, userId: string) => Promise<void>;
};

const BoardContext = createContext<BoardContextType | null>(null);

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [myRole, setMyRole] = useState<WorkspaceRole | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardFull, setBoardFull] = useState<BoardFullPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<WorkspaceMeResponse>("/api/workspaces/me");
      setWorkspace(data.workspace);
      setMembers(data.members);
      setMyRole(data.myRole);
      setBoards(data.boards);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load workspace";
      setError(
        msg.includes("404")
          ? `${msg} — Start the backend at ${LOCAL_API_URL} (cd backend && npm run dev).`
          : msg,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadBoard = useCallback(async (boardId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const full = await api.get<BoardFullPayload>(`/api/boards/${boardId}`);
      setBoardFull(full);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load board");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createBoard = useCallback(
    async (title: string) => {
      if (!workspace) return null;
      const board = await api.post<Board>(`/api/workspaces/${workspace.id}/boards`, { title });
      const withMeta = { ...board, memberCount: 1, isPersonal: true };
      setBoards((prev) => [withMeta, ...prev]);
      return withMeta;
    },
    [workspace],
  );

  const createCard = useCallback(
    async (listId: string, title: string) => {
      if (!boardFull) return;
      const card = await api.post<BoardCard>(`/api/boards/${boardFull.board.id}/lists/${listId}/cards`, { title });
      setBoardFull((prev) =>
        prev ? { ...prev, cards: [...prev.cards, card] } : prev,
      );
    },
    [boardFull],
  );

  const moveCard = useCallback(
    async (cardId: string, listId: string, sortOrder: number) => {
      if (!boardFull) return;
      const boardId = boardFull.board.id;
      setBoardFull((prev) => {
        if (!prev) return prev;
        const cards = prev.cards.map((c) =>
          c.id === cardId ? { ...c, listId, sortOrder } : c,
        );
        return { ...prev, cards };
      });
      try {
        const updated = await api.put<BoardCard>(`/api/boards/${boardId}/cards/${cardId}/move`, {
          listId,
          sortOrder,
        });
        setBoardFull((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            cards: prev.cards.map((c) => (c.id === cardId ? updated : c)),
          };
        });
      } catch {
        void loadBoard(boardId);
      }
    },
    [boardFull, loadBoard],
  );

  const updateCard = useCallback(
    async (cardId: string, patch: Partial<BoardCard>) => {
      if (!boardFull) return;
      const updated = await api.patch<BoardCard>(`/api/boards/${boardFull.board.id}/cards/${cardId}`, patch);
      setBoardFull((prev) => {
        if (!prev) return prev;
        return { ...prev, cards: prev.cards.map((c) => (c.id === cardId ? updated : c)) };
      });
    },
    [boardFull],
  );

  const deleteCard = useCallback(
    async (cardId: string) => {
      if (!boardFull) return;
      await api.del(`/api/boards/${boardFull.board.id}/cards/${cardId}`);
      setBoardFull((prev) =>
        prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) } : prev,
      );
    },
    [boardFull],
  );

  const inviteToBoard = useCallback(async (boardId: string, email: string) => {
    const res = await api.post<BoardInviteResponse>(`/api/boards/${boardId}/invites`, { email });
    if (res.kind === "added" && res.member) {
      setBoardFull((prev) =>
        prev && prev.board.id === boardId
          ? {
              ...prev,
              members: [...prev.members.filter((m) => m.userId !== res.member!.userId), res.member!],
            }
          : prev,
      );
      setBoards((prev) =>
        prev.map((b) =>
          b.id === boardId ? { ...b, memberCount: (b.memberCount ?? 1) + 1, isPersonal: false } : b,
        ),
      );
    }
    return res;
  }, []);

  const addBoardMember = useCallback(async (boardId: string, userId: string) => {
    const member = await api.post<BoardMember>(`/api/boards/${boardId}/members`, { userId });
    setBoardFull((prev) =>
      prev && prev.board.id === boardId
        ? { ...prev, members: [...prev.members.filter((m) => m.userId !== userId), member] }
        : prev,
    );
    setBoards((prev) =>
      prev.map((b) =>
        b.id === boardId ? { ...b, memberCount: (b.memberCount ?? 1) + 1, isPersonal: false } : b,
      ),
    );
    return member;
  }, []);

  const removeBoardMember = useCallback(async (boardId: string, userId: string) => {
    await api.del(`/api/boards/${boardId}/members/${userId}`);
    setBoardFull((prev) => {
      if (!prev || prev.board.id !== boardId) return prev;
      const members = prev.members.filter((m) => m.userId !== userId);
      return { ...prev, members };
    });
    setBoards((prev) =>
      prev.map((b) => {
        if (b.id !== boardId) return b;
        const nextCount = Math.max(1, (b.memberCount ?? 1) - 1);
        return { ...b, memberCount: nextCount, isPersonal: nextCount <= 1 };
      }),
    );
  }, []);

  return (
    <BoardContext.Provider
      value={{
        workspace,
        members,
        myRole,
        boards,
        boardFull,
        isLoading,
        error,
        refreshWorkspace,
        loadBoard,
        createBoard,
        createCard,
        moveCard,
        updateCard,
        deleteCard,
        inviteToBoard,
        addBoardMember,
        removeBoardMember,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export function useBoardStore() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoardStore must be used within BoardProvider");
  return ctx;
}
