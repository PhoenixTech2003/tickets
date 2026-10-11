"use client";

import { useEffect, useState } from "react";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { searchUsers, type UserHit } from "@/server/actions/users";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { initials } from "@/lib/format";

/**
 * Searches everyone who has signed up (Neon Auth users) via a server action,
 * debounced. `field="email"` restricts matching to email addresses.
 */
export function UserPicker({
  field = "any",
  excludeIds = [],
  selected,
  onSelect,
}: {
  field?: "any" | "email";
  excludeIds?: string[];
  selected: UserHit | null;
  onSelect: (user: UserHit) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<UserHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const result = await searchUsers({ query: q, field });
      if (!cancelled) {
        setHits(result.ok ? result.data : []);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, field]);

  const visible = query.trim().length < 2 ? [] : hits.filter((h) => !excludeIds.includes(h.id));

  return (
    <Command shouldFilter={false} className="rounded-xl border">
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={field === "email" ? "Search by email…" : "Search by name or email…"}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
          </div>
        )}
        {!loading && (
          <CommandEmpty>{query.trim().length < 2 ? "Type at least two characters." : "No one has signed up with that."}</CommandEmpty>
        )}
        {!loading && visible.length > 0 && (
          <CommandGroup heading="People">
            {visible.map((user) => (
              <CommandItem key={user.id} value={user.id} onSelect={() => onSelect(user)} className="gap-3">
                <Avatar className="size-7">
                  {user.image && <AvatarImage src={user.image} alt="" />}
                  <AvatarFallback className="text-[0.65rem]">{initials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="outline" className="text-[0.65rem]">
                  {ROLE_LABELS[user.role as Role]}
                </Badge>
                {selected?.id === user.id && <CheckIcon className="text-primary" />}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
