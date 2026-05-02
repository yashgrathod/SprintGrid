"use client";

import { Draggable } from "@hello-pangea/dnd";
import { GripVertical, Clock, CalendarDays, AlertTriangle } from "lucide-react";
import { formatDistanceToNow, addDays, format } from "date-fns";

export function TaskCard({ task, index, onClick }: { task: any, index: number, onClick?: () => void }) {
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100';
      case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100';
      case 'MEDIUM': return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100';
      case 'LOW': return 'bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-100';
    }
  };

  // Real due date or fallback
  const dueDate = task.deadline ? new Date(task.deadline) : addDays(new Date(task.createdAt), 3);

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const assigneeName = task.assignee?.name || "Unassigned";
  const isBlocked = !!task.blockedById;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={onClick}
          className={`bg-background border border-border rounded p-3 mb-3 flex flex-col group select-none transition-all cursor-pointer ${
            snapshot.isDragging ? 'shadow-lg border-primary ring-1 ring-primary/50 rotate-1' : 'hover:border-mutedForeground/40 shadow-sm'
          } ${isBlocked ? 'border-l-[3px] border-l-red-400' : ''}`}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex gap-2 items-center flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wide ${getPriorityStyles(task.priority)}`}>
                {task.priority}
              </span>
              {isBlocked && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm bg-red-50 text-red-600 border border-red-200 ring-1 ring-red-100">
                  <AlertTriangle size={10} />
                  BLOCKED
                </span>
              )}
            </div>
            <div 
              {...provided.dragHandleProps}
              className="text-mutedForeground opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-opacity"
            >
              <GripVertical size={14} />
            </div>
          </div>
          
          <h4 className="text-sm font-semibold text-foreground line-clamp-2 mb-1.5 leading-snug">{task.title}</h4>
          
          {task.description && (
            <p className="text-xs text-mutedForeground line-clamp-2 mb-3 leading-relaxed">{task.description}</p>
          )}

          <div className="mt-auto border-t border-border/50 pt-3 flex justify-between items-end">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center text-[11px] text-mutedForeground font-medium">
                <CalendarDays size={12} className="mr-1.5 opacity-70" />
                <span>Due {format(dueDate, 'MMM d')}</span>
              </div>
              <div className="flex items-center text-[10px] text-mutedForeground/80">
                <Clock size={10} className="mr-1 opacity-70" />
                <span>Added {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
            
            {/* Assignee Avatar Placeholder */}
            <div 
              className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold shadow-sm ring-2 ring-background"
              title={`Assignee: ${assigneeName}`}
            >
              {task.assignee ? getInitials(task.assignee.name) : "UA"}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
