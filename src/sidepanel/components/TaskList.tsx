import React from "react";
import type { AnalysisTask } from "@/shared/types/analysis-task";
import { TaskItem } from "./TaskItem";

interface TaskListProps {
  tasks: AnalysisTask[];
  activeTaskId: string | null;
  onView: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

export function TaskList({
  tasks,
  activeTaskId,
  onView,
  onRetry,
  onCancel,
}: TaskListProps) {
  if (!tasks.length) return null;

  const sorted = [...tasks].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
      {sorted.map((task, idx) => (
        <div
          key={task.id}
          className={`animate-fade-in-up delay-${Math.min(idx * 50, 300)}`}
        >
          <TaskItem
            task={task}
            active={task.id === activeTaskId}
            onView={() => onView(task.id)}
            onRetry={() => onRetry(task.id)}
            onCancel={() => onCancel(task.id)}
          />
        </div>
      ))}
    </div>
  );
}
