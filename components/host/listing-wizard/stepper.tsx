"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { WIZARD_STEPS } from "@/components/host/listing-wizard/types";

interface StepperProps {
  currentStepIndex: number;
  /** In edit mode the host can jump to any step; in create mode only completed + current. */
  allowJump: boolean;
  furthestStepIndex: number;
  onStepClick: (index: number) => void;
}

export function Stepper({
  currentStepIndex,
  allowJump,
  furthestStepIndex,
  onStepClick,
}: StepperProps) {
  const percent = ((currentStepIndex + 1) / WIZARD_STEPS.length) * 100;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
        </span>
        <span className="font-medium text-foreground">
          {WIZARD_STEPS[currentStepIndex].label}
        </span>
      </div>
      <Progress value={percent} className="mb-4" />
      <ol className="hidden flex-wrap gap-2 md:flex">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = index < furthestStepIndex;
          const isCurrent = index === currentStepIndex;
          const isClickable = allowJump || index <= furthestStepIndex;

          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(index)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCompleted
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground",
                  !isClickable && "cursor-not-allowed opacity-50"
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : <span>{index + 1}</span>}
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
