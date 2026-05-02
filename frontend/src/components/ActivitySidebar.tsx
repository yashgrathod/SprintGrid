"use client";

import { Activity as ActivityIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ActivitySidebar({ activities, hasMore, onLoadMore, loading }: { activities: any[], hasMore: boolean, onLoadMore: () => void, loading: boolean }) {
  const getActionText = (activity: any) => {
    switch (activity.action) {
      case 'CREATED_TASK':
        return <span>created task <span className="font-medium text-foreground">{activity.details?.title}</span></span>;
      case 'MOVED_TASK':
        return <span>moved <span className="font-medium text-foreground">{activity.details?.title}</span> to {activity.details?.to}</span>;
      default:
        return <span>performed an action</span>;
    }
  };

  return (
    <div className="w-80 border-l border-border bg-background flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center">
        <ActivityIcon className="w-4 h-4 mr-2 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Activity Timeline</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {activities.length === 0 ? (
          <p className="text-xs text-mutedForeground text-center mt-4">No activity yet</p>
        ) : (
          <>
            {activities.map((activity) => (
              <div key={activity.id} className="relative pl-4 border-l border-border pb-1 last:pb-0">
                <div className="absolute w-2 h-2 bg-primary rounded-full -left-[4.5px] top-1.5 ring-4 ring-background"></div>
                <p className="text-xs text-mutedForeground">
                  <span className="font-medium text-foreground">{activity.user.name}</span> {getActionText(activity)}
                </p>
                <span className="text-[10px] text-mutedForeground/70 block mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))}
            {hasMore && (
              <button 
                onClick={onLoadMore} 
                disabled={loading}
                className="w-full text-xs font-medium text-foreground bg-muted hover:bg-muted/80 py-2 rounded transition-colors disabled:opacity-50 mt-4"
              >
                {loading ? "Loading..." : "Load Older Activity"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
