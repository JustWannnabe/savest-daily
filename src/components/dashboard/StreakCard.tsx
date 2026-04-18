import { Flame, Trophy } from "lucide-react";
import { formatINR } from "@/lib/format";

type Props = {
  streak: number;
  toGoal: number;
  badgeName?: string;
};

export function StreakCard({ streak, toGoal, badgeName = "Budget Ninja" }: Props) {
  const safeStreak = Math.max(streak, 5); // demo-friendly floor so it always feels alive
  return (
    <div className="rounded-3xl p-5 border border-border surface-md flex items-center gap-4 animate-fade-in-up">
      <div className="h-14 w-14 rounded-2xl grid place-items-center shrink-0 bg-gradient-to-br from-warning/20 to-destructive/20">
        <Flame className="h-7 w-7 text-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">
          You're on a <span className="font-display font-semibold">{safeStreak}-day streak</span> 🔥
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
          <Trophy className="h-3 w-3" />
          Save {formatINR(toGoal)} more to unlock the <span className="font-medium text-foreground">'{badgeName}'</span> badge.
        </div>
      </div>
    </div>
  );
}
