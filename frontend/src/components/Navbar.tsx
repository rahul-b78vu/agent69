import React, { useState } from 'react';
import { LogOut, Play, Loader2, Menu, UserPlus, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { RunAgentModal } from './RunAgentModal';
import { AddStudentModal } from './AddStudentModal';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

  const primaryRole = user?.roles?.[0]?.name || 'USER';

  // Extract initials for clean avatar
  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <>
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3 lg:gap-6">
          {/* Mobile Sidebar Hamburger Toggle */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Run Agent Button with Blue Gradient & Pulse */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
            title="Trigger Agent 69 early-warning detection run"
          >
            {isModalOpen ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-200" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current text-blue-100" />
            )}
            <span className="whitespace-nowrap">Run Agent</span>
          </button>

          {/* Input Student Data Button with Mongo Compass Sync */}
          <button
            id="navbar-btn-add-student"
            onClick={() => setIsAddStudentOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black border border-slate-700 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
            title="Input student data and sync directly to MongoDB Compass"
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline whitespace-nowrap">+ Input Student Data</span>
            <span className="sm:hidden whitespace-nowrap">+ Input</span>
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded text-[10px] font-extrabold">
              <Database className="w-2.5 h-2.5 text-emerald-400" />
              Mongo
            </span>
          </button>

          {/* AI Monitoring Active Status */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-xs font-semibold text-emerald-800 shadow-2xs shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="tracking-tight whitespace-nowrap">AI Monitoring Active</span>
          </div>
        </div>

        {/* Authenticated User Profile Section & Logout */}
        <div className="flex items-center gap-3 md:gap-5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 font-bold text-xs shadow-2xs shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-slate-900 flex items-center justify-end gap-1.5">
                <span>{user?.full_name || 'Authenticated User'}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200/80">
                  {primaryRole}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">{user?.email || 'user@university.edu'}</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition-all duration-200 active:scale-95 cursor-pointer"
            title="Sign out of platform"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Trigger Pipeline Modal */}
      <RunAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Input Student Data Modal with MongoDB Compass Live Sync */}
      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onStudentAdded={() => {
          window.dispatchEvent(new CustomEvent('student-added'));
        }}
      />
    </>
  );
};
