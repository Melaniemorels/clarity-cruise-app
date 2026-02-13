import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Search, UserPlus, UserCheck, Link2, Contact } from "lucide-react";
import { useSearchProfiles, useFollow } from "@/hooks/use-profile";
import { toast } from "sonner";

const FindFriends = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: users = [], isLoading } = useSearchProfiles(searchQuery, true);
  const followMutation = useFollow();

  const handleFollow = (e: React.MouseEvent, userId: string, isFollowing: boolean) => {
    e.stopPropagation();
    followMutation.mutate({ targetUserId: userId, isFollowing });
  };

  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}`;
    navigator.clipboard.writeText(url).then(() => {
      toast("Link copiado");
    });
  };

  const handleShareInvite = async () => {
    const url = `${window.location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "VYV", text: "Únete a VYV", url });
      } catch { /* user cancelled */ }
    } else {
      handleCopyInviteLink();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-2xl p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Encontrar amigos</h1>
        </div>

        {/* Search by username */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Buscar por usuario</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar @usuario"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            {searchQuery.trim() && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {isLoading ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">Buscando…</p>
                ) : users.length === 0 ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">Sin resultados</p>
                ) : (
                  users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/profile/${u.user_id}`)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.photo_url || undefined} />
                          <AvatarFallback>{u.handle[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">@{u.handle}</p>
                          {u.name && <p className="text-xs text-muted-foreground truncate">{u.name}</p>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={u.is_following ? "outline" : "default"}
                        onClick={(e) => handleFollow(e, u.user_id, u.is_following)}
                        disabled={followMutation.isPending}
                        className="h-8 px-3 text-xs"
                      >
                        {u.is_following ? (
                          <><UserCheck className="h-3.5 w-3.5 mr-1" />Siguiendo</>
                        ) : (
                          <><UserPlus className="h-3.5 w-3.5 mr-1" />Seguir</>
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync contacts */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Sincronizar contactos</h3>
            <p className="text-xs text-muted-foreground">
              Sin permiso no podemos sugerirte contactos. Puedes buscar por usuario o invitar con link.
            </p>
            <Button variant="outline" className="w-full" onClick={() => toast("Próximamente")}>
              <Contact className="h-4 w-4 mr-2" />
              Conectar contactos
            </Button>
          </CardContent>
        </Card>

        {/* Invite link */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Invitar con link</h3>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopyInviteLink}>
                <Link2 className="h-4 w-4 mr-2" />
                Copiar link
              </Button>
              <Button className="flex-1" onClick={handleShareInvite}>
                Compartir…
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default FindFriends;
