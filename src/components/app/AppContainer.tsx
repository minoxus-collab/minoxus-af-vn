// src/components/app/AppContainer.tsx
import { useState } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';

export default function AppContainer() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  return (
    // Sửa h-[100dvh] về lại h-full ở đây
    <div className="flex w-full h-full bg-white overflow-hidden">
      
      {/* CỘT 1: SIDEBAR (Danh sách Project & Folder) */}
      <div 
        className={`w-full md:w-[320px] flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col 
        ${activeProjectId ? 'hidden md:flex' : 'flex'}`}
      >
        <Sidebar 
          activeProjectId={activeProjectId} 
          onSelectProject={(id: string) => setActiveProjectId(id)} 
        />
      </div>

      {/* CỘT 2: CHAT AREA (Khu vực Note bong bóng) */}
      <div 
        className={`flex-1 flex flex-col min-w-0 bg-white
        ${!activeProjectId ? 'hidden md:flex' : 'flex'}`}
      >
        {activeProjectId ? (
          <ChatArea 
            projectId={activeProjectId} 
            onBack={() => setActiveProjectId(null)} 
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-light uppercase tracking-widest bg-gray-50/50">
            Chọn một dự án để bắt đầu
          </div>
        )}
      </div>

      {/* CỘT 3: RIGHT PANEL (Trống, dành cho Phase sau) */}
      <div className="hidden lg:flex w-[280px] flex-shrink-0 border-l border-gray-200 bg-gray-50 p-4">
        <p className="text-xs text-gray-400 uppercase tracking-widest text-center w-full mt-4">
          Right Panel (Phase 2)
        </p>
      </div>

    </div>
  );
}