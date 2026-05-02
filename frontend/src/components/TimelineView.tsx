"use client";

import React, { useState, useCallback } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { AlertTriangle } from "lucide-react";

type DragAction = 'move' | 'resize-left' | 'resize-right';

interface DragState {
  taskId: string;
  startX: number;
  action: DragAction;
}

export function TimelineView({ tasks, onTaskUpdate }: { tasks: any[], onTaskUpdate: (taskId: string, updates: any) => void }) {
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Generate a 14-day timeline starting from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const days = Array.from({ length: 14 }).map((_, i) => addDays(today, i));

  const getTaskGridStyle = (task: any) => {
    // Prefer startDate over createdAt for positioning
    const start = new Date(task.startDate || task.createdAt);
    start.setHours(0, 0, 0, 0);
    
    // Default deadline to 3 days after start if none exists
    const end = task.deadline ? new Date(task.deadline) : addDays(start, 3);
    end.setHours(0, 0, 0, 0);

    // Calculate start position relative to today (max 1, bounded to 14)
    let startDayIdx = differenceInDays(start, today);
    if (startDayIdx < 0) startDayIdx = 0; // Starts before today -> clip to day 1

    let endDayIdx = differenceInDays(end, today);
    
    // Bounds checking
    if (endDayIdx < 0) return { display: 'none' as const }; // Ends before today
    if (startDayIdx > 13) return { display: 'none' as const }; // Starts after timeline

    if (endDayIdx > 13) endDayIdx = 13; // Clip to end of timeline

    const duration = endDayIdx - startDayIdx + 1;

    return {
      gridColumnStart: startDayIdx + 1, // CSS grid is 1-indexed
      gridColumnEnd: `span ${duration}`,
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-blue-500';
      case 'LOW': return 'bg-gray-400';
      default: return 'bg-gray-500';
    }
  };

  const getColWidth = useCallback(() => {
    const gridEl = document.getElementById('timeline-grid');
    if (!gridEl) return 0;
    return gridEl.clientWidth / 14;
  }, []);

  const handleDragStart = (e: React.DragEvent, task: any, action: DragAction) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
    // Use a transparent drag image to avoid the default ghost
    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
    setDragState({ taskId: task.id, startX: e.clientX, action });
  };

  const handleDragEnd = (e: React.DragEvent, task: any) => {
    e.preventDefault();
    if (!dragState || dragState.taskId !== task.id) return;

    const deltaX = e.clientX - dragState.startX;
    const colWidth = getColWidth();
    if (colWidth === 0) { setDragState(null); return; }
    
    const daysShifted = Math.round(deltaX / colWidth);
    
    if (daysShifted !== 0) {
      const currentStart = new Date(task.startDate || task.createdAt);
      const currentEnd = task.deadline ? new Date(task.deadline) : addDays(currentStart, 3);

      if (dragState.action === 'move') {
        // Shift both start and deadline by the same amount
        const newStart = new Date(currentStart);
        newStart.setDate(newStart.getDate() + daysShifted);
        const newDeadline = new Date(currentEnd);
        newDeadline.setDate(newDeadline.getDate() + daysShifted);

        onTaskUpdate(task.id, {
          startDate: newStart.toISOString(),
          deadline: newDeadline.toISOString()
        });
      } else if (dragState.action === 'resize-left') {
        // Only move the start date
        const newStart = new Date(currentStart);
        newStart.setDate(newStart.getDate() + daysShifted);
        // Guard: don't let start exceed end
        if (newStart < currentEnd) {
          onTaskUpdate(task.id, {
            startDate: newStart.toISOString()
          });
        }
      } else if (dragState.action === 'resize-right') {
        // Only move the deadline
        const newDeadline = new Date(currentEnd);
        newDeadline.setDate(newDeadline.getDate() + daysShifted);
        // Guard: don't let end precede start
        if (newDeadline > currentStart) {
          onTaskUpdate(task.id, {
            deadline: newDeadline.toISOString()
          });
        }
      }
    }

    setDragState(null);
  };

  return (
    <div className="w-full h-full overflow-auto bg-background border border-border rounded-lg shadow-sm flex flex-col">
      <div className="min-w-[800px] flex-1 flex flex-col">
        {/* Header Row */}
        <div className="flex border-b border-border bg-muted/50 sticky top-0 z-10">
          <div className="w-48 shrink-0 p-3 border-r border-border font-semibold text-xs text-mutedForeground uppercase tracking-wider flex items-center">
            Task
          </div>
          <div id="timeline-grid" className="flex-1 grid grid-cols-14" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
            {days.map((day, i) => (
              <div key={i} className="p-2 border-r border-border text-center text-[10px] font-medium text-mutedForeground border-dashed last:border-r-0">
                {format(day, "MMM d")}
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="flex-1 relative pb-8">
          {/* Vertical Grid Lines Background */}
          <div className="absolute inset-0 flex pl-48 pointer-events-none opacity-20">
            <div className="flex-1 grid grid-cols-14" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
              {days.map((_, i) => (
                <div key={i} className="border-r border-dashed border-mutedForeground h-full last:border-r-0"></div>
              ))}
            </div>
          </div>

          <div className="relative z-0">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-mutedForeground italic">No tasks to display in the timeline.</div>
            ) : (
              tasks.map(task => {
                const isBlocked = !!task.blockedById;
                const isDragging = dragState?.taskId === task.id;

                return (
                  <div key={task.id} className="flex border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <div className="w-48 shrink-0 p-3 border-r border-border flex items-center gap-2 pr-4">
                      {isBlocked && <AlertTriangle size={12} className="text-red-500 shrink-0" />}
                      <span className={`text-xs font-medium truncate ${isBlocked ? 'text-red-600' : 'text-foreground'}`}>{task.title}</span>
                    </div>
                    <div
                      className="flex-1 py-2 px-1 grid grid-cols-14 relative"
                      style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {/* Main task bar — draggable for MOVE */}
                      <div
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task, 'move')}
                        onDragEnd={(e) => handleDragEnd(e, task)}
                        className={`h-7 rounded-md shadow-sm flex items-center justify-between relative group/bar transition-all cursor-move ${getPriorityColor(task.priority)} hover:brightness-110 active:scale-[0.98] ${isDragging ? 'opacity-50 ring-2 ring-white/50' : 'opacity-100'}`}
                        style={getTaskGridStyle(task)}
                        title={`${task.title} (${task.priority})${isBlocked ? ' — BLOCKED' : ''}`}
                      >
                        {/* Left resize handle */}
                        <div
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, task, 'resize-left')}
                          onDragEnd={(e) => handleDragEnd(e, task)}
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize rounded-l-md bg-white/0 hover:bg-white/30 transition-colors z-10"
                          title="Drag to change start date"
                          onClick={(e) => e.stopPropagation()}
                        />

                        {/* Bar label */}
                        <span className="text-[10px] font-semibold text-white truncate px-3 pointer-events-none flex items-center gap-1">
                          {isBlocked && <AlertTriangle size={9} className="shrink-0" />}
                          {task.status.replace('_', ' ')}
                        </span>

                        {/* Right resize handle */}
                        <div
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, task, 'resize-right')}
                          onDragEnd={(e) => handleDragEnd(e, task)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize rounded-r-md bg-white/0 hover:bg-white/30 transition-colors z-10"
                          title="Drag to change deadline"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
