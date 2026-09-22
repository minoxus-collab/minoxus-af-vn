// src/components/app/Sidebar.tsx
import { useEffect, useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { 
  createProject, fetchSearchIndex, normalizeVietnamese, 
  fetchFolders, createFolder, assignProjectToFolder,
  updateProject, deleteProject, updateFolder, deleteFolder
} from '../../logic/appNote';

interface SidebarProps {
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
}

export default function Sidebar({ activeProjectId, onSelectProject }: SidebarProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [searchData, setSearchData] = useState<any[]>([]);
  
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null); 
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // STATE CHO CUSTOM PROMPT MODAL
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; value: string; onSubmit: (val: string) => void } | null>(null);

  useEffect(() => {
    async function initData() {
      const [data, foldersData] = await Promise.all([fetchSearchIndex(), fetchFolders()]);
      setProjects(data.projects);
      setFolders(foldersData);

      const initialExpanded: Record<string, boolean> = { unassigned: true };
      foldersData.forEach((f: any) => initialExpanded[f.id] = true);
      setExpandedFolders(initialExpanded);

      const formattedForSearch = data.projects.map(proj => {
        const pNotes = data.notes.filter((n: any) => n.project_id === proj.id);
        const pAttachments = pNotes.flatMap((n: any) => n.attachments || []);
        const combinedText = `${proj.name} ${proj.tags?.join(' ') || ''} ${pNotes.map((n: any) => n.content || '').join(' ')} ${pAttachments.map((a: any) => a.file_name || '').join(' ')}`;
        return { ...proj, normalizedSearchText: normalizeVietnamese(combinedText) };
      });
      
      setSearchData(formattedForSearch);
      setLoading(false);
    }
    initData();
  }, []);

  const fuse = useMemo(() => new Fuse(searchData, { keys: ['normalizedSearchText'], threshold: 0.3, ignoreLocation: true }), [searchData]);
  const isSearching = query.trim() !== '';
  const displayProjects = useMemo(() => {
    if (!isSearching) return projects;
    return fuse.search(normalizeVietnamese(query)).map(result => result.item);
  }, [query, projects, fuse, isSearching]);

  // -------- HÀNH ĐỘNG VỚI PROJECT --------
  const handleCreateProject = () => {
    setModal({
      isOpen: true, title: 'Nhập tên dự án mới', value: '',
      onSubmit: async (name) => {
        const newProject = await createProject(name);
        if (newProject) {
          setProjects(prev => [newProject, ...prev]);
          setExpandedFolders(prev => ({ ...prev, unassigned: true }));
          onSelectProject(newProject.id);
        }
      }
    });
  };

  const handleEditProject = (id: string, currentName: string) => {
    setMenuOpenId(null);
    setModal({
      isOpen: true, title: 'Sửa tên dự án', value: currentName,
      onSubmit: async (newName) => {
        await updateProject(id, newName);
        setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
      }
    });
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('Xóa dự án này? Toàn bộ ghi chú sẽ biến mất vĩnh viễn.')) {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProjectId === id) onSelectProject('');
    }
    setMenuOpenId(null);
  };

  const handleMoveProject = async (projectId: string, targetFolderId: string | null) => {
    await assignProjectToFolder(projectId, targetFolderId);
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, folder_id: targetFolderId } : p));
    if (targetFolderId) setExpandedFolders(prev => ({ ...prev, [targetFolderId]: true }));
    setMenuOpenId(null);
  };

  // -------- HÀNH ĐỘNG VỚI FOLDER --------
  const handleCreateFolder = () => {
    setModal({
      isOpen: true, title: 'Nhập tên thư mục mới', value: '',
      onSubmit: async (name) => {
        const newFolder = await createFolder(name);
        if (newFolder) {
          setFolders(prev => [...prev, newFolder]);
          setExpandedFolders(prev => ({ ...prev, [newFolder.id]: true }));
        }
      }
    });
  };

  const handleEditFolder = (id: string, currentName: string) => {
    setModal({
      isOpen: true, title: 'Sửa tên thư mục', value: currentName,
      onSubmit: async (newName) => {
        await updateFolder(id, newName);
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
      }
    });
  };

  const handleDeleteFolder = async (id: string) => {
    if (window.confirm('Xóa thư mục này? (Các dự án sẽ được chuyển ra Dự án lẻ)')) {
      await deleteFolder(id);
      setFolders(prev => prev.filter(f => f.id !== id));
      setProjects(prev => prev.map(p => p.folder_id === id ? { ...p, folder_id: null } : p));
    }
  };

  const renderProject = (p: any) => (
    <div key={p.id} className="relative group w-full">
      <button onClick={() => onSelectProject(p.id)} className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${activeProjectId === p.id ? 'bg-[#2C6B9E]/10 border border-[#2C6B9E]/20' : 'hover:bg-gray-200/50 border border-transparent'}`}>
        <div className="w-full overflow-hidden">
          <p className={`text-[13px] truncate ${activeProjectId === p.id ? 'font-medium text-[#2C6B9E]' : 'text-gray-800'}`}>{p.name}</p>
        </div>
      </button>
      
      <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === p.id ? null : p.id); }} className={`absolute right-2 top-2 p-1 bg-white border border-gray-200 rounded shadow-sm transition-opacity hover:text-[#2C6B9E] ${menuOpenId === p.id ? 'opacity-100 text-[#2C6B9E] border-[#2C6B9E]/30' : 'opacity-0 group-hover:opacity-100'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
      </button>

      {menuOpenId === p.id && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); }} />
          <div className="absolute right-8 top-2 z-50 w-44 bg-white border border-gray-200 shadow-xl rounded-lg py-1 overflow-hidden">
            <button onClick={(e) => { e.stopPropagation(); handleEditProject(p.id, p.name); }} className="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-100 text-blue-600 transition-colors">✏️ Đổi tên dự án</button>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }} className="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-100 text-red-600 transition-colors">🗑️ Xóa dự án</button>
            <div className="border-t border-gray-100 my-1"></div>
            <p className="px-3 py-1 text-[9px] font-bold text-gray-400 uppercase">Di chuyển đến</p>
            <div className="max-h-32 overflow-y-auto">
              <button onClick={(e) => { e.stopPropagation(); handleMoveProject(p.id, null); }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-gray-100 text-gray-700">📁 [Bỏ ra dự án lẻ]</button>
              {folders.map(f => (
                <button key={f.id} onClick={(e) => { e.stopPropagation(); handleMoveProject(p.id, f.id); }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-gray-100 text-gray-700 truncate">📁 {f.name}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Dự án</h2>
          <div className="flex gap-1">
            <button onClick={handleCreateFolder} className="text-gray-400 hover:text-[#2C6B9E] transition-colors p-1" title="Thêm thư mục"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg></button>
            <button onClick={handleCreateProject} className="text-gray-400 hover:text-[#2C6B9E] transition-colors p-1" title="Thêm dự án"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg></button>
          </div>
        </div>
        <div className="relative">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm dự án, ghi chú..." className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 pr-8 text-[13px] outline-none focus:border-[#2C6B9E]" />
          {/* NÚT X XÓA NHANH TÌM KIẾM */}
          {query.length > 0 && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-2 text-gray-400 hover:text-gray-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 bg-gray-50 pb-32">
        {loading ? <p className="text-center text-xs text-gray-400 mt-4 uppercase tracking-widest">Đang tải...</p> : isSearching ? (
          <div className="space-y-1">{displayProjects.map(renderProject)}</div>
        ) : (
          <div className="space-y-3">
            {folders.map(folder => {
              const folderProjects = displayProjects.filter(p => p.folder_id === folder.id);
              const isExpanded = expandedFolders[folder.id];
              return (
                <div key={folder.id} className="space-y-1 group/folder">
                  <div className="flex items-center justify-between px-2 pr-4">
                    <button onClick={() => setExpandedFolders(p => ({...p, [folder.id]: !p[folder.id]}))} className="flex items-center gap-2 flex-1 text-left py-1 text-gray-500 hover:text-black">
                      <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest truncate">{folder.name}</span>
                    </button>
                    <div className="opacity-0 group-hover/folder:opacity-100 flex gap-1 transition-opacity">
                      <button onClick={() => handleEditFolder(folder.id, folder.name)} className="text-blue-400 hover:text-blue-600"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                      <button onClick={() => handleDeleteFolder(folder.id)} className="text-red-400 hover:text-red-600"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                  </div>
                  {isExpanded && <div className="pl-3 space-y-1">{folderProjects.map(renderProject)}</div>}
                </div>
              );
            })}

            {displayProjects.filter(p => !p.folder_id).length > 0 && (
              <div className="space-y-1 pt-2 border-t border-gray-200/50 mt-2">
                <button onClick={() => setExpandedFolders(p => ({...p, unassigned: !p.unassigned}))} className="flex items-center gap-2 w-full text-left px-2 py-1 text-gray-500 hover:text-black">
                  <svg className={`w-3 h-3 transition-transform ${expandedFolders['unassigned'] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Dự án lẻ</span>
                </button>
                {expandedFolders['unassigned'] && (
                  <div className="pl-3 space-y-1">{displayProjects.filter(p => !p.folder_id).map(renderProject)}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RENDER CUSTOM MODAL */}
      {modal?.isOpen && (
        <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 animate-in fade-in zoom-in duration-200">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-800 mb-4">{modal.title}</h3>
            <input 
              type="text" 
              autoFocus
              defaultValue={modal.value}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2C6B9E] mb-5"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.currentTarget.value.trim();
                  if (val && val !== modal.value) modal.onSubmit(val);
                  setModal(null);
                }
              }}
              id="prompt-input"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase hover:bg-gray-100 rounded-lg">Hủy</button>
              <button 
                onClick={() => {
                  const val = (document.getElementById('prompt-input') as HTMLInputElement).value.trim();
                  if (val && val !== modal.value) modal.onSubmit(val);
                  setModal(null);
                }} 
                className="px-4 py-2 text-xs font-bold text-white bg-[#2C6B9E] uppercase hover:bg-[#205178] rounded-lg shadow-sm"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}