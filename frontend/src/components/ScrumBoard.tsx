"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { TaskCard } from "./TaskCard";
import api from "@/lib/axios";

export function ScrumBoard({ projectId, initialTasks, onTaskClick }: { projectId: string, initialTasks: any[], onTaskClick?: (task: any) => void }) {
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const columns = [
    { id: 'TODO', title: 'To-Do' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'DONE', title: 'Done' }
  ];

  const getTasksByStatus = (status: string) => {
    return tasks.filter(t => t.status === status).sort((a, b) => a.position - b.position);
  };

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Optimistic Update
    const newTasks = Array.from(tasks);
    const taskIndex = newTasks.findIndex(t => t.id === draggableId);
    const taskToMove = newTasks[taskIndex];
    
    // Update local state temporarily
    const originalStatus = taskToMove.status;
    taskToMove.status = destination.droppableId;
    
    const destTasks = newTasks.filter(t => t.status === destination.droppableId).sort((a, b) => a.position - b.position);
    
    // Calculate new position
    let newPosition = 1024;
    if (destTasks.length > 0) {
      if (destination.index === 0) {
        newPosition = destTasks[0].position / 2;
      } else if (destination.index >= destTasks.length) {
        newPosition = destTasks[destTasks.length - 1].position + 1024;
      } else {
        const prev = destTasks[destination.index - 1].position;
        const next = destTasks[destination.index].position;
        newPosition = prev + (next - prev) / 2;
      }
    }
    
    taskToMove.position = newPosition;
    setTasks(newTasks);

    try {
      await api.patch(`/projects/${projectId}/tasks/${draggableId}/move`, {
        newStatus: destination.droppableId,
        newPosition
      });
    } catch (error) {
      // Revert on failure
      console.error("Failed to move task");
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full h-full pb-4">
        {columns.map(column => (
          <div key={column.id} className="flex flex-col flex-1 min-w-0 bg-muted/30 border border-border rounded-md overflow-hidden h-[500px] lg:h-full">
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50 shrink-0">
              <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">{column.title}</h3>
              <span className="bg-background border border-border text-foreground text-xs px-2 py-0.5 rounded-full font-medium shadow-sm">
                {getTasksByStatus(column.id).length}
              </span>
            </div>
            
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 p-3 overflow-y-auto no-scrollbar transition-colors ${
                    snapshot.isDraggingOver ? 'bg-muted/80' : ''
                  }`}
                >
                  {getTasksByStatus(column.id).map((task, index) => (
                    <TaskCard key={task.id} task={task} index={index} onClick={() => onTaskClick?.(task)} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
