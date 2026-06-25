export type WorkspaceRole = "owner" | "admin" | "member";

export interface Workspace {
  id: string;
  name: string;
  createdByUserId: string;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  email: string;
}

export type BoardMemberRole = "owner" | "member";

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: BoardMemberRole;
  addedAt: string;
  email: string;
}

export interface Board {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  createdByUserId: string;
  createdAt: string;
  memberCount?: number;
  isPersonal?: boolean;
}

export interface BoardList {
  id: string;
  boardId: string;
  title: string;
  sortOrder: number;
}

export type CardPriority = "low" | "medium" | "high" | "urgent";

export interface BoardCard {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description: string;
  assigneeUserId: string | null;
  dueDate: string | null;
  priority: CardPriority;
  sortOrder: number;
  createdByUserId: string;
  createdAt: string;
}

export interface BoardActivity {
  id: string;
  boardId: string;
  userId: string;
  action: string;
  cardId: string | null;
  details: string;
  createdAt: string;
}

export type InviteEmailStatus = {
  attempted: boolean;
  queued: boolean;
  sent: boolean;
  error: string | null;
};

export interface WorkspaceInviteResponse {
  invite: {
    id: string;
    email: string;
    role: WorkspaceRole;
    expiresAt: string;
  };
  link: string;
  email: InviteEmailStatus;
  smtpConfigured?: boolean;
  emailProvider?: "resend" | "smtp" | "none";
}

export interface BoardInviteResponse {
  kind: "added" | "invite";
  invite?: {
    id: string;
    email: string;
    expiresAt: string;
  };
  member?: BoardMember;
  link?: string;
  email: InviteEmailStatus;
  smtpConfigured?: boolean;
  emailProvider?: "resend" | "smtp" | "none";
}

export interface WorkspaceMeResponse {
  workspace: Workspace;
  members: WorkspaceMember[];
  boards: Board[];
  myRole: WorkspaceRole;
}

export interface BoardFullPayload {
  board: Board;
  lists: BoardList[];
  cards: BoardCard[];
  members: BoardMember[];
  activity: BoardActivity[];
}
