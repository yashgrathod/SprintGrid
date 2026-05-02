"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { useSocket } from "@/hooks/useSocket";
import { Navbar } from "@/components/Navbar";
import { ScrumBoard } from "@/components/ScrumBoard";
import { TimelineView } from "@/components/TimelineView";
import { ActivitySidebar } from "@/components/ActivitySidebar";
import { Plus } from "lucide-react";

export default function ProjectPage() {
  const { id } = useParams() as { id: string };

  // Select a primitive (string | null) instead of the full user object
  // so the selector returns a stable reference and does not re-trigger effects.
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const router = useRouter();

  // useSocket MUST be called unconditionally, above any early returns,
  // so it is never unmounted by a loading/redirect branch.
  const socket = useSocket(id);

  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskStartDate, setTaskStartDate] = useState("");
  const [taskBlockedById, setTaskBlockedById] = useState("");
  const [taskFile, setTaskFile] = useState<File | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<'BOARD' | 'TIMELINE'>('BOARD');

  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTasks, setAiTasks] = useState<any[]>([]);
  const [selectedAiTasks, setSelectedAiTasks] = useState<number[]>([]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Guard: only fetch once per project id
  const hasFetched = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, actRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/activities?page=1&limit=15`)
      ]);

      setProject(projRes.data);
      setTasks(projRes.data.tasks || []);
      setActivities(actRes.data.activities || []);
      setHasMoreActivities(actRes.data.hasMore || false);

      localStorage.setItem(`project_cache_${id}`, JSON.stringify({
        project: projRes.data,
        tasks: projRes.data.tasks || [],
        activities: actRes.data.activities || []
      }));
    } catch (error) {
      console.error("Failed to fetch project data");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // Auth redirect + initial data fetch
  useEffect(() => {
    if (!userId) {
      router.push("/login");
      return;
    }

    // Only fetch if we haven't already fetched for this project id
    if (hasFetched.current !== id) {
      hasFetched.current = id;
      
      const cached = localStorage.getItem(`project_cache_${id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setProject(parsed.project);
          setTasks(parsed.tasks);
          setActivities(parsed.activities || []);
          setLoading(false);
        } catch (e) {}
      }

      fetchData();
    }
  }, [userId, id, fetchData, router]);

  // Socket event listeners (stable reference: socket is a global singleton)
  useEffect(() => {
    if (!socket) return;

    const onTaskCreated = (task: any) => {
      setTasks(prev => [...prev, task]);
    };
    const onTaskMoved = ({ taskId, newStatus, newPosition }: any) => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, position: newPosition } : t));
    };
    const onActivityLogged = (activity: any) => {
      setActivities(prev => [activity, ...prev]);
    };

    socket.on('task-created', onTaskCreated);
    socket.on('task-moved', onTaskMoved);
    socket.on('activity-logged', onActivityLogged);

    return () => {
      socket.off('task-created', onTaskCreated);
      socket.off('task-moved', onTaskMoved);
      socket.off('activity-logged', onActivityLogged);
    };
  }, [socket]);

  const openCreateModal = () => {
    setSelectedTask(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskPriority("MEDIUM");
    setTaskDeadline("");
    setTaskStartDate("");
    setTaskBlockedById("");
    setTaskFile(null);
    setShowTaskModal(true);
  };

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || "");
    setTaskPriority(task.priority);
    setTaskDeadline(task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : "");
    setTaskStartDate(task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "");
    setTaskBlockedById(task.blockedById || "");
    setTaskFile(null);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let savedTask;
      if (selectedTask) {
        const res = await api.put(`/projects/${id}/tasks/${selectedTask.id}`, {
          title: taskTitle,
          description: taskDesc,
          priority: taskPriority,
          status: selectedTask.status,
          deadline: taskDeadline || null,
          startDate: taskStartDate || null,
          blockedById: taskBlockedById || null
        });
        savedTask = res.data;
      } else {
        const res = await api.post(`/projects/${id}/tasks`, {
          title: taskTitle,
          description: taskDesc,
          priority: taskPriority,
          status: 'TODO',
          deadline: taskDeadline || null,
          startDate: taskStartDate || null,
          blockedById: taskBlockedById || null
        });
        savedTask = res.data;
      }

      if (taskFile && savedTask) {
        const formData = new FormData();
        formData.append("file", taskFile);
        await api.post(`/projects/${id}/tasks/${savedTask.id}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      setShowTaskModal(false);
    } catch (error) {
      console.error("Failed to save task");
    }
  };

  const handleInstantFileUpload = async (file: File) => {
    if (!selectedTask) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/projects/${id}/tasks/${selectedTask.id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSelectedTask(res.data);
      
      // Update local task list
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? res.data : t));
    } catch (error) {
      console.error("Failed to upload attachment", error);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    try {
      await api.delete(`/projects/${id}/tasks/${selectedTask.id}`);
      setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      setShowTaskModal(false);
    } catch (error) {
      console.error("Failed to delete task", error);
      alert("Failed to delete task. You might not have permission.");
    }
  };

  const handleTaskTimelineUpdate = async (taskId: string, updates: any) => {
    // Optimistic update
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    try {
      const payload: any = { title: task.title };
      if (updates.startDate) payload.startDate = updates.startDate;
      if (updates.deadline) payload.deadline = updates.deadline;
      if (updates.createdAt) payload.createdAt = updates.createdAt;

      await api.put(`/projects/${id}/tasks/${taskId}`, payload);
    } catch (error) {
      console.error("Failed to update task via timeline");
    }
  };

  const handleMarkCompleted = async () => {
    const newStatus = project?.status === 'COMPLETED' ? 'ONGOING' : 'COMPLETED';
    const actionText = newStatus === 'COMPLETED' ? "Mark this project as completed?" : "Reopen this project?";
    
    if (!confirm(actionText)) return;
    try {
      const res = await api.patch(`/projects/${id}/status`, { status: newStatus });
      setProject(res.data);
    } catch (error) {
      console.error("Failed to update project status");
      alert("Failed to update project. You might not have permission.");
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError("");
    setInviteLink("");
    try {
      const res = await api.post(`/projects/${id}/invites`, {
        email: inviteEmail,
        role: inviteRole
      });
      setInviteLink(`http://localhost:3000/invite/${res.data.invite.token}`);
    } catch (error: any) {
      setInviteError(error.response?.data?.error || "Failed to create invite");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAiSprintAssist = async () => {
    setShowAiModal(true);
    setAiLoading(true);
    setAiTasks([]);
    setSelectedAiTasks([]);
    try {
      const res = await api.post(`/projects/${id}/ai-workflow`);
      setAiTasks(res.data);
      // Pre-select all by default
      setSelectedAiTasks(res.data.map((_: any, i: number) => i));
    } catch (error) {
      console.error("AI workflow generation failed", error);
      // Optional: add error state handling here
    } finally {
      setAiLoading(false);
    }
  };

  const toggleAiTaskSelection = (index: number) => {
    setSelectedAiTasks(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  const applyAiTasks = async () => {
    if (aiTasks.length === 0 || selectedAiTasks.length === 0) return;
    try {
      const tasksToCreate = aiTasks.filter((_, idx) => selectedAiTasks.includes(idx));
      
      await Promise.all(
        tasksToCreate.map(task => {
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + (task.estimatedDays || 3));
          
          return api.post(`/projects/${id}/tasks`, {
            title: task.title,
            description: task.description,
            priority: task.priority || 'MEDIUM',
            status: 'TODO',
            deadline: deadline.toISOString()
          });
        })
      );
      setShowAiModal(false);
      setAiTasks([]);
    } catch (error) {
      console.error("Failed to apply AI tasks", error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
  };

  const loadMoreActivities = async () => {
    if (!hasMoreActivities || loadingActivities) return;
    setLoadingActivities(true);
    try {
      const nextPage = activityPage + 1;
      const res = await api.get(`/projects/${id}/activities?page=${nextPage}&limit=15`);
      setActivities(prev => [...prev, ...res.data.activities]);
      setActivityPage(nextPage);
      setHasMoreActivities(res.data.hasMore);
    } catch (error) {
      console.error("Failed to load more activities");
    } finally {
      setLoadingActivities(false);
    }
  };

  // Loading state renders AFTER all hooks have been called.
  // This prevents useSocket from being unmounted during loading.
  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-muted overflow-hidden">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm font-medium text-mutedForeground">
          Loading project...
        </div>
      </div>
    );
  }

  // Calculate current user role for RBAC
  const isOwner = String(project?.ownerId) === String(userId);
  const membership = project?.members?.find((m: any) => String(m.userId) === String(userId));
  const currentUserRole = isOwner ? 'OWNER' : (membership?.role || 'MEMBER');
  const canManage = ['OWNER', 'ADMIN', 'SUBADMIN'].includes(currentUserRole);

  const is100PercentDone = tasks.length > 0 && tasks.every(t => t.status === 'DONE');
  const showCompletedButton = canManage && (project?.status === 'COMPLETED' || is100PercentDone);

  return (
    <div className="h-screen flex flex-col bg-muted overflow-hidden">
      <Navbar />

      <header className="bg-background border-b border-border px-6 py-4 flex justify-between items-center shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">{project?.title}</h1>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 tracking-wide uppercase">
              {currentUserRole}
            </span>
            {project?.status === 'COMPLETED' && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded border border-green-200">COMPLETED</span>}
          </div>
          <p className="text-sm text-mutedForeground mt-1">{project?.description}</p>
        </div>
        <div className="flex space-x-3 items-center">
          {showCompletedButton && (
            <button
              onClick={handleMarkCompleted}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors shadow-sm flex items-center border ${
                project?.status === 'COMPLETED' 
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-500/50 hover:bg-yellow-100' 
                  : 'bg-green-50 text-green-700 border-green-500/50 hover:bg-green-100'
              }`}
            >
              {project?.status === 'COMPLETED' ? 'Reopen Project' : 'Mark as Completed'}
            </button>
          )}
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center border border-border px-3 py-1.5 rounded text-sm font-medium hover:bg-muted transition-colors text-foreground"
          >
            Invite Members
          </button>
          <button
            onClick={handleAiSprintAssist}
            className="flex items-center border border-indigo-500/50 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-100 transition-colors shadow-sm"
          >
            AI Sprint Assist
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center bg-primary text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-primaryHover transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Task
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto flex flex-col">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6 shrink-0">
            <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
              <h3 className="text-xs font-medium text-mutedForeground uppercase tracking-wider mb-1">Total Tasks</h3>
              <p className="text-2xl font-semibold text-foreground">{tasks.length}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
              <h3 className="text-xs font-medium text-mutedForeground uppercase tracking-wider mb-1">Completion %</h3>
              <p className="text-2xl font-semibold text-foreground">
                {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'DONE').length / tasks.length) * 100) : 0}%
              </p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
              <h3 className="text-xs font-medium text-mutedForeground uppercase tracking-wider mb-1">Active Members</h3>
              <p className="text-2xl font-semibold text-foreground">{project?.members?.length || 0}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3 mb-6 shrink-0">
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 p-2 text-sm border border-border rounded focus:ring-1 focus:ring-primary focus:outline-none"
            />
            <select 
              value={priorityFilter} 
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-40 p-2 text-sm border border-border rounded focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="w-40 p-2 text-sm border border-border rounded focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="TODO">To-Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
            
            <div className="flex bg-muted/50 border border-border rounded p-1 ml-auto">
              <button 
                onClick={() => setViewMode('BOARD')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'BOARD' ? 'bg-background text-foreground shadow-sm' : 'text-mutedForeground hover:text-foreground'}`}
              >
                Board View
              </button>
              <button 
                onClick={() => setViewMode('TIMELINE')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'TIMELINE' ? 'bg-background text-foreground shadow-sm' : 'text-mutedForeground hover:text-foreground'}`}
              >
                Timeline View
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {viewMode === 'BOARD' ? (
              <ScrumBoard projectId={id} initialTasks={filteredTasks} onTaskClick={handleTaskClick} />
            ) : (
              <TimelineView tasks={filteredTasks} onTaskUpdate={handleTaskTimelineUpdate} />
            )}
          </div>
        </div>

        <ActivitySidebar 
          activities={activities} 
          hasMore={hasMoreActivities} 
          onLoadMore={loadMoreActivities} 
          loading={loadingActivities} 
        />
      </main>

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border-sharp p-6 w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-foreground">{selectedTask ? 'Edit Task' : 'Add New Task'}</h2>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-mutedForeground mb-1 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mutedForeground mb-1 uppercase tracking-wider">Description</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm h-24 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-mutedForeground mb-1 uppercase tracking-wider">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-mutedForeground mb-1 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-mutedForeground mb-1 uppercase tracking-wider">Deadline</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-mutedForeground mb-1 uppercase tracking-wider">Blocked By</label>
                  <select
                    value={taskBlockedById}
                    onChange={(e) => setTaskBlockedById(e.target.value)}
                    className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  >
                    <option value="">None</option>
                    {tasks.filter(t => t.id !== selectedTask?.id).map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-mutedForeground mb-1 uppercase tracking-wider">Attachments</label>
                {selectedTask?.attachments && selectedTask.attachments.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {selectedTask.attachments.map((url: string, i: number) => (
                      <a key={i} href={`http://localhost:5000${url}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline block truncate">
                        {url.split('/').pop()}
                      </a>
                    ))}
                  </div>
                )}
                <input
                  type="file"
                  onChange={(e) => setTaskFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-3 py-1.5 text-sm font-medium text-mutedForeground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-foreground text-background rounded text-sm font-medium hover:bg-gray-800"
                >
                  {selectedTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border-sharp p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Invite to Project</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-mutedForeground mb-1 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mutedForeground mb-1 uppercase tracking-wider">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                >
                  <option value="MEMBER">Member</option>
                  <option value="SUBADMIN">Subadmin</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              
              {inviteError && <p className="text-red-500 text-sm">{inviteError}</p>}

              {inviteLink && (
                <div className="mt-4 p-3 bg-muted border border-border rounded">
                  <p className="text-xs text-mutedForeground mb-2">Invite link generated. Share this with the user:</p>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={inviteLink} 
                      className="flex-1 p-1 text-xs border border-border rounded bg-background text-foreground"
                    />
                    <button 
                      type="button" 
                      onClick={copyToClipboard}
                      className="px-2 py-1 bg-foreground text-background text-xs rounded hover:bg-gray-800"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowInviteModal(false); setInviteLink(""); }}
                  className="px-3 py-1.5 text-sm font-medium text-mutedForeground hover:text-foreground"
                >
                  Close
                </button>
                {!inviteLink && (
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="px-3 py-1.5 bg-foreground text-background rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                  >
                    {inviteLoading ? 'Generating...' : 'Generate Link'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border-sharp p-6 w-full max-w-2xl shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center">
                AI Sprint Assistant
              </h2>
              <button onClick={() => setShowAiModal(false)} className="text-mutedForeground hover:text-foreground">X</button>
            </div>
            
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-12 flex-1">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium text-mutedForeground">Scrum Master AI is analyzing your project...</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-4">
                  {aiTasks.map((task, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => toggleAiTaskSelection(idx)}
                      className={`p-3 border rounded transition-colors cursor-pointer flex items-start gap-3 ${
                        selectedAiTasks.includes(idx) ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-background border-border hover:bg-muted/50'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedAiTasks.includes(idx)} 
                        onChange={() => {}} 
                        className="mt-1 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-semibold ${selectedAiTasks.includes(idx) ? 'text-indigo-900' : 'text-foreground'}`}>{task.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wide border ${
                            selectedAiTasks.includes(idx) ? 'bg-white border-indigo-100 text-indigo-700' : 'bg-background border-border text-foreground'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className={`text-xs mb-2 ${selectedAiTasks.includes(idx) ? 'text-indigo-700/80' : 'text-mutedForeground'}`}>{task.description}</p>
                        <div className={`text-[11px] font-medium ${selectedAiTasks.includes(idx) ? 'text-indigo-600' : 'text-mutedForeground'}`}>
                          Est. Time: {task.estimatedDays} days
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-border mt-auto">
                  <div className="text-xs font-medium text-mutedForeground">
                    {selectedAiTasks.length} task(s) selected
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowAiModal(false)}
                      className="px-4 py-2 text-sm font-medium text-mutedForeground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={applyAiTasks}
                      disabled={selectedAiTasks.length === 0}
                      className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add to Sprint Board
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
