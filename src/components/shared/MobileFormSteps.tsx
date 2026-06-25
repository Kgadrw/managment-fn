import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = {
  key: string;
  title: string;
  content: React.ReactNode;
  canContinue?: () => boolean;
};

export function MobileFormSteps({
  steps,
  onClose,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  isLoading,
}: {
  steps: Step[];
  onClose?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  isLoading?: boolean;
}) {
  const [stepIdx, setStepIdx] = React.useState(0);

  React.useEffect(() => {
    // When dialog content remounts, always start at step 1.
    setStepIdx(0);
  }, [steps.length]);

  const isLast = stepIdx === steps.length - 1;
  const step = steps[stepIdx]!;
  const canContinue = step.canContinue ? step.canContinue() : true;

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{step.title}</p>
          <p className="text-xs text-muted-foreground">
            Step {stepIdx + 1} of {steps.length}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <span
              key={s.key}
              className={cn(
                "h-1.5 w-4 rounded-full transition-colors",
                i === stepIdx ? "bg-primary" : "bg-muted",
              )}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3">{step.content}</div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (stepIdx === 0) onClose?.();
            else setStepIdx((v) => Math.max(0, v - 1));
          }}
          disabled={!!isLoading}
        >
          {stepIdx === 0 ? "Cancel" : "Back"}
        </Button>

        {isLast ? (
          <Button
            type="button"
            onClick={onPrimary}
            disabled={!!isLoading || !!primaryDisabled}
          >
            {isLoading ? "Saving..." : primaryLabel}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setStepIdx((v) => Math.min(steps.length - 1, v + 1))}
            disabled={!!isLoading || !canContinue}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

