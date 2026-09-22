// src/components/app/ChatArea.tsx
import { useEffect, useState, useRef, useMemo } from 'react';
import { fetchNotes, createNote, fetchProject, updateProjectTags, fetchAllTags, updateNote, deleteNote, uploadImageAndCreateNote, type NoteLabel } from '../../logic/appNote';

interface ChatAreaProps {
  projectId: string;
  onBack: () => void;
}

export default function ChatArea({ projectId, onBack }: ChatAreaProps) {
  const [project, setProject] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  
  const [inputText, setInputText] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<NoteLabel>('note_thuong');
  const [hasManuallySelectedLabel, setHasManuallySelectedLabel] = useState(false);
  
  const [tagInput, setTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // --- MULTI-SELECT STATE ---
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [showAggregateModal, setShowAggregateModal] = useState(false);

  // --- CUSTOM EDIT MODAL STATE ---
  const [editModal, setEditModal] = useState<{ isOpen: boolean; id: string; content: string } | null>(null);

  const allImages = useMemo(() => {
    const images: { noteId: string; url: string; caption: string | null }[] = [];
    notes.forEach(n => {
      if (n.attachments?.length > 0) {
        n.attachments.forEach((a: any) => { if (a.type === 'image') images.push({ noteId: n.id, url: a.url, caption: n.content }); });
      }
    });
    return images;
  }, [notes]);

  const selectedTextNotes = useMemo(() => notes.filter(n => selectedNotes.includes(n.id) && (!n.attachments || n.attachments.length === 0)), [notes, selectedNotes]);
  const selectedImageNotes = useMemo(() => notes.filter(n => selectedNotes.includes(n.id) && n.attachments?.length > 0 && n.attachments[0].type === 'image'), [notes, selectedNotes]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [projData, notesData, tagsData] = await Promise.all([
        fetchProject(projectId), fetchNotes(projectId), fetchAllTags()
      ]);
      setProject(projData); setNotes(notesData); setAllTags(tagsData); setLoading(false);
    }
    loadData();
    setIsSelectMode(false); setSelectedNotes([]);
  }, [projectId]);

  useEffect(() => {
    if (hasManuallySelectedLabel) return;
    if (inputText.includes('```')) setSelectedLabel('code');
    else if (inputText.match(/https?:\/\//)) setSelectedLabel('link');
    else setSelectedLabel('note_thuong');
  }, [inputText, hasManuallySelectedLabel]);

  // -------- XỬ LÝ ẢNH & FILE --------
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const newNote = await uploadImageAndCreateNote(projectId, file, inputText.trim());
      if (newNote) {
        setNotes(prev => [...prev, newNote]);
        setInputText(''); setSelectedLabel('note_thuong'); setHasManuallySelectedLabel(false);
      }
    } catch (error: any) { alert(error.message || 'Lỗi khi tải ảnh lên!'); } 
    finally { setIsUploading(false); }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handleFileUpload(file);
        break;
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFileUpload(file);
  };

  // -------- XỬ LÝ CHAT --------
  const triggerSend = async () => {
    if (inputText.trim() !== '') {
      const newNote = await createNote(projectId, inputText.trim(), selectedLabel);
      if (newNote) {
        setNotes(prev => [...prev, newNote]);
        setInputText(''); setSelectedLabel('note_thuong'); setHasManuallySelectedLabel(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerSend();
    }
  };

  // -------- CRUD TAGS --------
  useEffect(() => {
    const currentTags = project?.tags || [];
    if (tagInput.trim() === '') setTagSuggestions(allTags.filter(t => !currentTags.includes(t)));
    else setTagSuggestions(allTags.filter(t => t.includes(tagInput.toLowerCase()) && !currentTags.includes(t)));
  }, [tagInput, allTags, project?.tags]);

  const commitNewTag = async (newTagStr: string) => {
    const cleanTag = newTagStr.trim().toLowerCase();
    if (!cleanTag) return;
    const currentTags = project.tags || [];
    if (!currentTags.includes(cleanTag)) {
      const updatedTags = [...currentTags, cleanTag];
      setProject({ ...project, tags: updatedTags });
      await updateProjectTags(projectId, updatedTags);
      if (!allTags.includes(cleanTag)) setAllTags(prev => [...prev, cleanTag]);
    }
    setTagInput(''); setIsAddingTag(false); setShowSuggestions(false);
  };
  
  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = (project.tags || []).filter((t: string) => t !== tagToRemove);
    setProject({ ...project, tags: updatedTags });
    await updateProjectTags(projectId, updatedTags);
  };

  // -------- MULTI-SELECT --------
  const toggleSelectNote = (id: string) => {
    setSelectedNotes(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedNotes.length === 0) return;
    if (window.confirm(`Xóa vĩnh viễn ${selectedNotes.length} mục đã chọn?`)) {
      await Promise.all(selectedNotes.map(id => deleteNote(id)));
      setNotes(prev => prev.filter(n => !selectedNotes.includes(n.id)));
      setSelectedNotes([]); setIsSelectMode(false);
    }
  };

  const handleCopyAggregate = () => {
    const textToCopy = selectedTextNotes.map(n => `- ${n.content}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    alert('Đã copy danh sách text vào bộ nhớ tạm!');
  };

  const handleDownloadBulkImages = async () => {
    if (selectedImageNotes.length === 0) return;
    for (const n of selectedImageNotes) {
      try {
        const url = n.attachments[0].url;
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = n.attachments[0].file_name || `image-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error('Lỗi tải ảnh:', err);
      }
    }
  };

  // ĐÃ FIX CHUẨN CÚ PHÁP LABEL_CONFIG
  const LABEL_CONFIG: Record<NoteLabel, { text: string; bg: string; activeBg: string; textCol: string }> = {
    note_thuong: { text: 'Note Thường', bg: 'bg-gray-100', activeBg: 'bg-gray-700', textCol: 'text-white' },
    code: { text: 'Code', bg: 'bg-blue-100', activeBg: 'bg-blue-500', textCol: 'text-white' },
    link: { text: 'Link', bg: 'bg-green-100', activeBg: 'bg-green-500', textCol: 'text-white' },
    prompt: { text: 'Prompt', bg: 'bg-purple-100', activeBg: 'bg-purple-500', textCol: 'text-white' },
    image: { text: 'Image', bg: 'bg-orange-100', activeBg: 'bg-orange-500', textCol: 'text-white' },
  }

  return (
    <div className="flex-1 flex flex-col h-full relative bg-white" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      
      {/* HEADER */}
      <div className="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-10 flex-shrink-0">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center flex-1 overflow-hidden pr-2">
            <button onClick={onBack} className="md:hidden mr-3 p-2 -ml-2 text-gray-500 hover:text-black">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h2 className="text-[14px] font-medium text-[#0D0D0D] uppercase tracking-widest truncate">{project?.name || '...'}</h2>
          </div>
          <button 
            onClick={() => { setIsSelectMode(!isSelectMode); setSelectedNotes([]); }}
            className={`text-[11px] px-3 py-1.5 rounded uppercase font-bold tracking-widest transition-colors ${isSelectMode ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {isSelectMode ? 'Hủy chọn' : 'Chọn nhiều'}
          </button>
        </div>
        
        {!isSelectMode && (
          <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
            {(project?.tags || []).map((tag: string) => (
              <div key={tag} className="group flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-[11px] font-medium transition-colors hover:bg-gray-200 border border-gray-200">
                <span className="text-gray-400">#</span>{tag}
                <button onClick={() => handleRemoveTag(tag)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 ml-1 transition-opacity"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              </div>
            ))}
            {isAddingTag ? (
              <div className="relative">
                <div className="flex items-center bg-white border border-[#2C6B9E] rounded px-2 py-1 shadow-sm">
                  <span className="text-gray-400 text-xs mr-1">#</span>
                  <input autoFocus type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => { setIsAddingTag(false); setShowSuggestions(false); }, 200)} onKeyDown={(e) => e.key === 'Enter' && commitNewTag(tagInput)} placeholder="Nhập tag..." className="text-xs outline-none w-24 placeholder-gray-300" />
                </div>
                {showSuggestions && tagSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 shadow-xl rounded-md z-50 max-h-40 overflow-y-auto py-1">
                    {tagSuggestions.map(t => <button key={t} onMouseDown={(e) => { e.preventDefault(); commitNewTag(t); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 hover:text-[#2C6B9E] transition-colors">#{t}</button>)}
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setIsAddingTag(true)} className="text-[11px] text-gray-400 hover:text-[#2C6B9E] flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 hover:border-[#2C6B9E] rounded transition-colors">+ Thêm tag</button>
            )}
          </div>
        )}
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-5">
        {loading ? <p className="text-center text-xs text-gray-400 mt-4 uppercase tracking-widest">Đang tải...</p> : notes.map(note => {
          const config = LABEL_CONFIG[note.label as NoteLabel] || LABEL_CONFIG['note_thuong'];
          const isSpecial = note.label !== 'note_thuong';
          const hasImage = note.attachments?.length > 0 && note.attachments[0].type === 'image';
          const isSelected = selectedNotes.includes(note.id);
          
          return (
            <div key={note.id} className={`relative flex items-start w-full group z-10 gap-3 ${isSelectMode ? 'cursor-pointer' : ''}`} onClick={() => isSelectMode && toggleSelectNote(note.id)}>
              {isSelectMode && (
                <div className="flex-shrink-0 pt-3 pl-1">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#2C6B9E] border-[#2C6B9E]' : 'border-gray-300 bg-white'}`}>
                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>}
                  </div>
                </div>
              )}

              <div className="flex flex-col items-start max-w-[85%] relative">
                <div className={`rounded-2xl rounded-tl-sm shadow-sm transition-colors overflow-hidden ${isSelected && isSelectMode ? 'ring-2 ring-[#2C6B9E]/50' : ''} ${isSpecial ? `${config.bg} bg-opacity-30 border border-${config.activeBg.split('-')[1]}-200 text-gray-900` : 'bg-gray-100 text-gray-800'}`}>
                  {hasImage && (
                    <div className="cursor-pointer border-b border-black/5" onClick={() => { if (!isSelectMode) setLightboxIndex(allImages.findIndex(img => img.noteId === note.id)); }}>
                      <img src={note.attachments[0].url} alt="attachment" className="max-w-[280px] max-h-[280px] object-cover hover:opacity-90 transition-opacity block" />
                    </div>
                  )}
                  {(note.content || isSpecial) && (
                    <div className="px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap">
                      {isSpecial && <span className={`inline-block ${config.activeBg} ${config.textCol} text-[9px] px-1.5 py-0.5 rounded-sm mr-2 mb-1 tracking-widest font-bold uppercase`}>{config.text}</span>}
                      {note.content}
                    </div>
                  )}
                </div>

                {!isSelectMode && (
                  <div className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition-opacity">
                    <button onClick={() => setEditModal({ isOpen: true, id: note.id, content: note.content || '' })} className="p-1.5 bg-white border border-gray-200 rounded-full text-blue-500 hover:bg-blue-50 shadow-sm" title="Sửa"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button onClick={async () => {
                        if (window.confirm(hasImage ? 'Xóa ảnh này vĩnh viễn?' : 'Xóa ghi chú này?')) {
                          await deleteNote(note.id);
                          setNotes(prev => prev.filter(n => n.id !== note.id));
                        }
                      }} className="p-1.5 bg-white border border-gray-200 rounded-full text-red-500 hover:bg-red-50 shadow-sm" title="Xóa"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                  </div>
                )}
                <span className="text-[10px] text-gray-400 mt-1 ml-1 tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                  {new Date(note.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* THANH CÔNG CỤ (Có pb-8 để đẩy lên tránh thanh điều hướng mobile) */}
      <div className="border-t border-gray-200 bg-white flex-shrink-0 flex flex-col z-10 pb-8 md:pb-0">
        {isSelectMode ? (
          <div className="p-4 flex items-center justify-between bg-gray-50 h-20">
            <span className="text-sm font-medium text-gray-600">Đã chọn: <strong className="text-[#2C6B9E]">{selectedNotes.length}</strong> mục</span>
            <div className="flex gap-2">
              <button onClick={handleBulkDelete} disabled={selectedNotes.length === 0} className="px-4 py-2 bg-white border border-red-200 text-red-500 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-red-50 disabled:opacity-50">Xóa</button>
              <button onClick={() => setShowAggregateModal(true)} disabled={selectedNotes.length === 0} className="px-4 py-2 bg-[#2C6B9E] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#205178] disabled:opacity-50 shadow-sm">Tổng hợp</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 pt-3 pb-1 overflow-x-auto hide-scrollbar">
              {(Object.keys(LABEL_CONFIG) as NoteLabel[]).filter(k => k !== 'image').map(key => (
                <button key={key} onClick={() => { setSelectedLabel(key); setHasManuallySelectedLabel(true); }} className={`flex-shrink-0 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-bold transition-all border ${selectedLabel === key ? `${LABEL_CONFIG[key].activeBg}${LABEL_CONFIG[key].textCol} border-transparent shadow-sm` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'}`}>{LABEL_CONFIG[key].text}</button>
              ))}
            </div>
            <div className="p-3">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 flex items-center shadow-inner focus-within:bg-white focus-within:border-[#2C6B9E] transition-colors gap-2">
                <input type="file" ref={fileInputRef} onChange={onFileSelect} accept="image/jpeg, image/png, image/webp, image/gif" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-[#2C6B9E] transition-colors rounded-lg hover:bg-[#2C6B9E]/10" title="Đính kèm ảnh">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </button>
                <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste} placeholder="Viết note, dán link hoặc dán ảnh..." className="flex-1 outline-none text-sm bg-transparent px-2" />
                
                {/* NÚT SEND (MÁY BAY GIẤY) */}
                <button onClick={triggerSend} disabled={inputText.trim() === ''} className="p-2 text-[#2C6B9E] disabled:text-gray-300 hover:bg-[#2C6B9E]/10 transition-colors rounded-lg" title="Gửi (Enter)">
                  <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL SỬA NOTE (CUSTOM THAY CHO WINDOW.PROMPT) */}
      {editModal?.isOpen && (
        <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5 animate-in fade-in zoom-in duration-200">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-800 mb-4">Sửa nội dung</h3>
            <textarea 
              autoFocus
              defaultValue={editModal.content}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2C6B9E] mb-5 resize-none"
              id="note-edit-input"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditModal(null)} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase hover:bg-gray-100 rounded-lg">Hủy</button>
              <button 
                onClick={async () => {
                  const val = (document.getElementById('note-edit-input') as HTMLTextAreaElement).value.trim();
                  if (val && val !== editModal.content) {
                    await updateNote(editModal.id, val);
                    setNotes(prev => prev.map(n => n.id === editModal.id ? { ...n, content: val } : n));
                  }
                  setEditModal(null);
                }} 
                className="px-4 py-2 text-xs font-bold text-white bg-[#2C6B9E] uppercase hover:bg-[#205178] rounded-lg shadow-sm"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TỔNG HỢP MULTI-SELECT */}
      {showAggregateModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-800">Tổng hợp nội dung</h3>
              <button onClick={() => setShowAggregateModal(false)} className="text-gray-400 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              {selectedTextNotes.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b-2 border-[#2C6B9E] pb-1 inline-block">Văn bản ({selectedTextNotes.length})</h4>
                    <button onClick={handleCopyAggregate} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded uppercase font-bold tracking-widest flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> Copy danh sách
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <ul className="list-disc pl-4 space-y-2 text-sm text-gray-700 font-serif whitespace-pre-wrap">
                      {selectedTextNotes.map(n => <li key={n.id}>{n.content}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {selectedImageNotes.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 border-b-2 border-orange-500 pb-1 inline-block">Hình ảnh ({selectedImageNotes.length})</h4>
                    <button onClick={handleDownloadBulkImages} className="text-[10px] bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1.5 rounded uppercase font-bold tracking-widest flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Tải tất cả
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {selectedImageNotes.map(n => (
                      <div key={n.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative group">
                        <img src={n.attachments[0].url} alt="img" className="w-full h-full object-cover" />
                        {n.content && <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 truncate text-[9px] text-white text-center">{n.content}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX (XEM ẢNH FULL MÀN HÌNH) */}
      {lightboxIndex !== null && allImages.length > 0 && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center">
          <button onClick={() => setLightboxIndex(null)} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-10 bg-black/50 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          {allImages.length > 1 && (
            <>
              <button onClick={() => setLightboxIndex(prev => prev === 0 ? allImages.length - 1 : (prev as number) - 1)} className="absolute left-6 text-white/50 hover:text-white p-3 z-10 bg-black/50 hover:bg-black rounded-full transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></button>
              <button onClick={() => setLightboxIndex(prev => prev === allImages.length - 1 ? 0 : (prev as number) + 1)} className="absolute right-6 text-white/50 hover:text-white p-3 z-10 bg-black/50 hover:bg-black rounded-full transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></button>
            </>
          )}
          <div className="flex flex-col items-center justify-center max-w-5xl max-h-[90vh] p-4">
            <img src={allImages[lightboxIndex].url} alt="Full size" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
            {allImages[lightboxIndex].caption && <p className="mt-6 text-white/90 text-sm font-medium tracking-wide bg-black/50 px-6 py-2 rounded-full backdrop-blur">{allImages[lightboxIndex].caption}</p>}
            <p className="mt-4 text-white/30 text-[10px] font-bold uppercase tracking-[0.3em]">{lightboxIndex + 1} / {allImages.length}</p>
          </div>
        </div>
      )}
      
    </div>
  );
}