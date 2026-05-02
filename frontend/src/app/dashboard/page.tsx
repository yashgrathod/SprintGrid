"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { Navbar } from "@/components/Navbar";
import { Plus, Folder } from "lucide-react";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<{email: string, role: string}[]>([]);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("ONGOING");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchProjects();
  }, [user, router]);

  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch (error) {
      console.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post("/projects", { title, description, members });
      setProjects([res.data, ...projects]);
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setMembers([]);
    } catch (error) {
      console.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  if (!user || loading) return <div className="min-h-screen bg-muted flex items-center justify-center text-sm font-medium">Loading...</div>;

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Your Workspaces</h1>
          <button 
            onClick={() => setShowCreate(true)}
            className="bg-primary text-white px-4 py-2 rounded text-sm font-medium hover:bg-primaryHover transition-colors flex items-center shadow-sm"
          >
            <Plus size={16} className="mr-2" /> New Project
          </button>
        </div>

        <div className="flex space-x-6 border-b border-border mb-6">
          <button
            onClick={() => setActiveTab("ONGOING")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "ONGOING"
                ? "border-b-2 border-primary text-primary"
                : "text-mutedForeground hover:text-foreground"
            }`}
          >
            Active Sprints
          </button>
          <button
            onClick={() => setActiveTab("COMPLETED")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "COMPLETED"
                ? "border-b-2 border-primary text-primary"
                : "text-mutedForeground hover:text-foreground"
            }`}
          >
            Completed Projects
          </button>
        </div>

        {showCreate && (
          <div className="bg-background border-sharp p-5 mb-8 max-w-lg shadow-sm">
            <h2 className="text-sm font-semibold mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-mutedForeground mb-1 uppercase tracking-wider">Project Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm bg-background"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mutedForeground mb-1 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm bg-background h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-mutedForeground mb-1 uppercase tracking-wider">Invite Members (Optional)</label>
                {members.map((member, idx) => (
                  <div key={idx} className="flex space-x-2 mb-2">
                    <input
                      type="email"
                      value={member.email}
                      onChange={(e) => {
                        const newMembers = [...members];
                        newMembers[idx].email = e.target.value;
                        setMembers(newMembers);
                      }}
                      placeholder="Email"
                      className="flex-1 p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm bg-background"
                      required
                    />
                    <select
                      value={member.role}
                      onChange={(e) => {
                        const newMembers = [...members];
                        newMembers[idx].role = e.target.value;
                        setMembers(newMembers);
                      }}
                      className="w-24 p-2 border-sharp rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm bg-background"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setMembers(members.filter((_, i) => i !== idx))}
                      className="px-2 bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100"
                    >
                      X
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setMembers([...members, { email: '', role: 'MEMBER' }])}
                  className="text-xs text-primary font-medium hover:underline mt-1"
                >
                  + Add Member
                </button>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-1.5 text-sm font-medium text-mutedForeground hover:text-foreground"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-3 py-1.5 bg-foreground text-background rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-16 border-sharp border-dashed rounded bg-background">
            <Folder className="w-10 h-10 text-mutedForeground mx-auto mb-3 opacity-20" />
            <h3 className="text-sm font-medium text-foreground">No projects yet</h3>
            <p className="text-sm text-mutedForeground mt-1">Get started by creating a new project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects
              .filter(p => (p.status || "ONGOING") === activeTab)
              .map(project => (
              <div 
                key={project.id} 
                onClick={() => router.push(`/projects/${project.id}`)}
                className="bg-background border border-border p-5 rounded-lg shadow-sm hover:shadow-md hover:border-mutedForeground/30 transition-all cursor-pointer group flex flex-col min-h-[160px]"
              >
                <h3 className="font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">{project.title}</h3>
                <p className="text-sm text-mutedForeground line-clamp-2 mt-1">{project.description || 'No description provided'}</p>
                
                <div className="flex items-center text-xs text-mutedForeground mt-auto border-t border-border/50 pt-3">
                  <span className="flex items-center">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-foreground mr-1.5 ring-1 ring-border">
                      {project.owner?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    Owner
                  </span>
                  <span className="mx-2">•</span>
                  <span>{project.members?.length || 0} Members</span>
                </div>
              </div>
            ))}
            {projects.filter(p => (p.status || "ONGOING") === activeTab).length === 0 && (
              <div className="col-span-full py-12 text-center text-mutedForeground text-sm border border-dashed border-border rounded">
                No {activeTab.toLowerCase()} projects found.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
