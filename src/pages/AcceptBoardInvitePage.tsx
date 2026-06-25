import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccessToken } from "@/lib/auth";

export default function AcceptBoardInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<{
    boardTitle: string;
    boardId: string;
    email: string;
    emailMatch: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (!getAccessToken()) {
      navigate(`/login?redirect=/invite/board/${token}`);
      return;
    }
    api
      .get<{ boardTitle: string; boardId: string; email: string; emailMatch: boolean }>(
        `/api/board-invites/${token}`,
      )
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : "Invalid invite"));
  }, [token, navigate]);

  const accept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const result = await api.post<{ boardId: string }>(`/api/board-invites/${token}/accept`, {});
      navigate(`/boards/${result.boardId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept invite");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader>
          <CardTitle>Board invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && (
            <>
              <p className="text-sm text-muted-foreground">
                You&apos;ve been invited to the board <strong>{info.boardTitle}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">Invite sent to: {info.email}</p>
              {!info.emailMatch && (
                <p className="text-xs text-amber-600">
                  Your login email doesn&apos;t match this invite. Sign in with {info.email} to accept.
                </p>
              )}
              <Button className="w-full" disabled={accepting || !info.emailMatch} onClick={() => void accept()}>
                {accepting ? "Joining…" : "Accept & open board"}
              </Button>
            </>
          )}
          {!info && !error && <p className="text-sm text-muted-foreground">Loading invite…</p>}
          <Button variant="link" asChild className="w-full">
            <Link to="/boards">All boards</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
