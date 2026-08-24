// src/editor/Editor.tsx
import React, { useState, useRef, useEffect, memo, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { Block } from './blocks';
import ImageModal from './ImageModal';
import PostLinkModal from './PostLinkModal';
import AffiliateLinkModal from './AffiliateLinkModal';
import { getAffiliateById, getLinkStatus } from '../logic/affiliate'; 
import SEOPanel, { type SeoData } from './SEOPanel';

interface EditorProps {
  initialBlocks: Block[];
  initialSeoData?: SeoData;
  onChange: (blocks: Block[], seoData?: SeoData) => void;
  onSave?: () => void;
  isContentOnly?: boolean; // Bổ sung công tắc ẩn hiện UI
}

const COMMANDS = [
  { type: 'text', label: 'Văn bản (Text)' },
  { type: 'heading', level: 2, label: 'Tiêu đề 2 (H2)' },
  { type: 'heading', level: 3, label: 'Tiêu đề 3 (H3)' },
  { type: 'heading', level: 4, label: 'Tiêu đề 4 (H4)' },
  { type: 'image', label: 'Hình ảnh (Image)' },
  { type: 'post-link', label: 'Link bài viết nội bộ' },
  { type: 'affiliate-link', label: 'Link Affiliate' },
  { type: 'quote', label: 'Trích dẫn (Quote)' },
  { type: 'code', label: 'Mã code (Code)' },
  { type: 'bullet-list', label: 'Danh sách Bullet' },
  { type: 'numbered-list', label: 'Danh sách Số' },
  { type: 'table', label: 'Bảng (Table)' },
  { type: 'callout', label: 'Khối chú ý (Callout)' },
  { type: 'video-embed', label: 'Nhúng Video' },
  { type: 'divider', label: 'Đường phân cách' },
  { type: 'html-embed', label: 'Mã HTML (Embed)' }
];

const AffiliateBlockPreview = memo(({ block }: { block: any }) => {
  const [status, setStatus] = useState<'loading' | 'active' | 'expiring' | 'expired'>('loading');
  const [expiredDateStr, setExpiredDateStr] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const { data, error } = await getAffiliateById(block.affiliateId);
        if (data && isMounted) {
          setStatus(getLinkStatus(data.expired_at));
          if (data.expired_at) {
            setExpiredDateStr(new Date(data.expired_at).toLocaleDateString('vi-VN'));
          }
        }
      } catch (err) {
        console.error("Lỗi lấy trạng thái link affiliate:", err);
      }
    };
    fetchStatus();
    return () => { isMounted = false; };
  }, [block.affiliateId]);

  return (
    <div className={`my-4 p-4 border rounded-xl flex flex-col select-none transition-colors ${
      status === 'expired' ? 'border-red-300 bg-red-50/40' :
      status === 'expiring' ? 'border-amber-300 bg-amber-50/40' :
      'border-green-200 bg-green-50/20'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <span className={`text-white text-[10px] font-bold uppercase px-2 py-1 rounded tracking-wider shrink-0 ${
            status === 'expired' ? 'bg-red-600' :
            status === 'expiring' ? 'bg-amber-600' :
            'bg-green-600'
          }`}>
            {status === 'loading' ? 'Đang check...' : 'Affiliate Link'}
          </span>
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${status === 'expired' ? 'text-red-900 line-through opacity-70' : 'text-gray-900'}`}>
              {block.name}
            </p>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mt-0.5">Nền tảng: {block.platform}</p>
          </div>
        </div>
        <div className="text-[11px] text-gray-400 italic shrink-0 pl-2">[Khối Affiliate]</div>
      </div>
      {status === 'expired' && (
        <div className="mt-3 bg-red-100/80 border border-red-200 text-red-800 text-xs px-3 py-2.5 rounded flex items-start shadow-sm">
          <span className="leading-relaxed">⚠️ Link này <strong>ĐÃ HẾT HẠN</strong> vào ngày {expiredDateStr} — hãy cập nhật liên kết mới trước khi publish!</span>
        </div>
      )}
      {status === 'expiring' && (
        <div className="mt-3 bg-amber-100/80 border border-amber-200 text-amber-900 text-xs px-3 py-2.5 rounded flex items-start shadow-sm">
          <span className="leading-relaxed">⚠️ Cảnh báo: Link này sắp hết hạn vào ngày <strong>{expiredDateStr}</strong> — hãy theo dõi!</span>
        </div>
      )}
    </div>
  );
});

const EditableBlock = memo(({ block, index, onInput, onKeyDown, placeholder, className }: any) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current && divRef.current.innerHTML === '') {
      divRef.current.innerHTML = block.html || block.text || '';
    }
  }, []);

  return (
    <div
      id={`block-${index}`}
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onInput(e, index)}
      onKeyDown={(e) => onKeyDown(e, index)}
      data-placeholder={placeholder}
      className={className}
    />
  );
}, (prev, next) => {
  return (prev.block as any).type === (next.block as any).type && (prev.block as any).level === (next.block as any).level && prev.index === next.index;
});

export default function Editor({ initialBlocks, initialSeoData, onChange, onSave, isContentOnly = false }: EditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [seoData, setSeoData] = useState<SeoData>(initialSeoData || {
    title: '', slug: '', type: 'pillar', status: 'draft', meta_description: '', generate_toc: false, featured_image: '', og_title: '', focus_keyword: '', canonical_url: ''
  });

  useEffect(() => {
    if (initialSeoData) setSeoData(initialSeoData);
  }, [initialSeoData]);

  const [menu, setMenu] = useState({ isOpen: false, index: -1, top: 0, left: 0, query: '' });
  const [menuIndex, setMenuIndex] = useState(0);
  const [inlineToolbar, setInlineToolbar] = useState({ isOpen: false, top: 0, left: 0 });
  const [imageModal, setImageModal] = useState<{isOpen: boolean, insertIndex: number, target: 'block' | 'featured'}>({ isOpen: false, insertIndex: -1, target: 'block' });
  const [postLinkModal, setPostLinkModal] = useState({ isOpen: false, insertIndex: -1 });
  const [affiliateModal, setAffiliateModal] = useState({ isOpen: false, insertIndex: -1 });
  
  const editorRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef(blocks);
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);

  const menuRef = useRef(menu);
  useEffect(() => { menuRef.current = menu; }, [menu]);

  const menuIndexRef = useRef(menuIndex);
  useEffect(() => { menuIndexRef.current = menuIndex; }, [menuIndex]);

  useEffect(() => {
    onChange(blocks, seoData);
  }, [blocks, seoData, onChange]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const saveIndicator = document.getElementById('save-indicator');
    if (saveIndicator) {
      saveIndicator.className = "text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md";
      saveIndicator.textContent = "Chưa lưu";
    }
    if (!seoData.title.trim()) return;
    const timer = setTimeout(() => {
      const nativeForm = editorRef.current?.closest('form');
      if (nativeForm) nativeForm.requestSubmit();
    }, 30000);
    return () => clearTimeout(timer);
  }, [blocks, seoData]);
  
  useEffect(() => {
    setMenuIndex(0);
  }, [menu.query, menu.isOpen]);

  const filteredCommands = COMMANDS.filter(c => 
    c.label.toLowerCase().includes(menu.query) || 
    c.type.includes(menu.query)
  );
  const filteredCommandsRef = useRef(filteredCommands);
  useEffect(() => { filteredCommandsRef.current = filteredCommands; }, [filteredCommands]);

  const wordCount = useMemo(() => {
    return blocks.reduce((acc, block) => {
      const bType = (block as any).type;
      let text = '';
      if (bType === 'text' || bType === 'heading') {
        text = (block as any).html || (block as any).text || '';
      } else if (['quote', 'callout', 'code', 'bullet-list', 'numbered-list', 'html-embed'].includes(bType)) {
        text = (block as any).html || '';
      } else if (bType === 'table') {
        text = ((block as any).rows || []).flat().join(' ');
      }
      text = text.replace(/<[^>]*>?/gm, ' ');
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      return acc + words.length;
    }, 0);
  }, [blocks]);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
          const rect = range.getBoundingClientRect();
          const editorRect = editorRef.current.getBoundingClientRect();
          setInlineToolbar({
            isOpen: true,
            top: rect.top - editorRect.top - 45,
            left: rect.left - editorRect.left + (rect.width / 2),
          });
          return;
        }
      }
      setInlineToolbar(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleInput = (e: React.FormEvent<HTMLDivElement>, index: number) => {
    const text = e.currentTarget.textContent || '';
    const html = e.currentTarget.innerHTML;

    if (text.startsWith('/')) {
      const rect = e.currentTarget.getBoundingClientRect();
      const editorRect = editorRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
      setMenu({
        isOpen: true,
        index,
        top: rect.bottom - editorRect.top + 5,
        left: rect.left - editorRect.left,
        query: text.slice(1).toLowerCase()
      });
    } else {
      setMenu(m => ({ ...m, isOpen: false }));
    }

    const newBlocks = [...blocksRef.current];
    if (newBlocks[index]) {
        const bType = (newBlocks[index] as any).type;
        if (bType === 'text') {
            (newBlocks[index] as any).html = html;
        } else if (bType === 'heading') {
            (newBlocks[index] as any).html = html;
            (newBlocks[index] as any).text = text;
        } else if (['quote', 'callout', 'code', 'bullet-list', 'numbered-list', 'html-embed'].includes(bType)) {
            (newBlocks[index] as any).html = html;
        }
    }
    setBlocks(newBlocks);
  };

  const insertBlock = (cmd: typeof COMMANDS[0]) => {
    const newBlocks = [...blocksRef.current];
    const idx = menuRef.current.index;
    let targetFocusIndex = idx;

    if (cmd.type === 'image') {
      setImageModal({ isOpen: true, insertIndex: idx, target: 'block' });
      setMenu({ isOpen: false, index: -1, top: 0, left: 0, query: '' });
      return; 
    }
    if (cmd.type === 'post-link') {
      setPostLinkModal({ isOpen: true, insertIndex: idx });
      setMenu({ isOpen: false, index: -1, top: 0, left: 0, query: '' });
      return; 
    }
    if (cmd.type === 'affiliate-link') {
      setAffiliateModal({ isOpen: true, insertIndex: idx });
      setMenu({ isOpen: false, index: -1, top: 0, left: 0, query: '' });
      return;
    }

    if (cmd.type === 'heading') {
      newBlocks[idx] = { type: 'heading', level: cmd.level as any, text: '' } as any;
    } else if (cmd.type === 'text') {
      newBlocks[idx] = { type: 'text', html: '' } as any;
    } else if (['quote', 'callout', 'code', 'bullet-list', 'numbered-list', 'html-embed'].includes(cmd.type)) {
      newBlocks[idx] = { type: cmd.type, html: '' } as any;
      newBlocks.splice(idx + 1, 0, { type: 'text', html: '' } as any);
      targetFocusIndex = idx + 1;
    } else {
      if (cmd.type === 'divider') {
          newBlocks[idx] = { type: 'divider' } as any;
      } else if (cmd.type === 'video-embed') {
          newBlocks[idx] = { type: 'video-embed', src: '' } as any;
      } else if (cmd.type === 'table') {
          newBlocks[idx] = { type: 'table', headers: [], rows: [['Cột 1', 'Cột 2'], ['Dữ liệu', 'Dữ liệu']] } as any;
      } else {
          newBlocks[idx] = { type: cmd.type, html: '', text: '', items: [] } as any;
      }
      newBlocks.splice(idx + 1, 0, { type: 'text', html: '' } as any);
      targetFocusIndex = idx + 1;
    }

    setBlocks(newBlocks);
    setMenu({ isOpen: false, index: -1, top: 0, left: 0, query: '' });
    
    setTimeout(() => {
      const el = document.getElementById(`block-${targetFocusIndex}`);
      if (el) {
        el.focus();
        if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
      }
    }, 50);
  };

  const handleImageSelected = (src: string, alt: string, caption: string, alignment: 'center' | 'left' | 'right' | 'full', linkUrl: string) => {
    if (imageModal.target === 'featured') {
      setSeoData(prev => ({ ...prev, featured_image: src }));
      setImageModal({ isOpen: false, insertIndex: -1, target: 'block' });
      return;
    }
    const idx = imageModal.insertIndex;
    const newBlocks = [...blocksRef.current];
    newBlocks[idx] = { type: 'image', src, alt, caption, alignment, linkUrl } as any;
    newBlocks.splice(idx + 1, 0, { type: 'text', html: '' } as any);
    setBlocks(newBlocks);
    setImageModal({ isOpen: false, insertIndex: -1, target: 'block' });
    setTimeout(() => {
      const el = document.getElementById(`block-${idx + 1}`);
      if (el) el.focus();
    }, 50);
  };

  const handlePostLinkSelected = (post: { id: string; title: string; slug: string }) => {
    const idx = postLinkModal.insertIndex;
    const newBlocks = [...blocksRef.current];
    newBlocks[idx] = { type: 'post-link', postId: post.id, title: post.title, slug: post.slug } as any;
    newBlocks.splice(idx + 1, 0, { type: 'text', html: '' } as any);
    setBlocks(newBlocks);
    setPostLinkModal({ isOpen: false, insertIndex: -1 });
    setTimeout(() => {
      const el = document.getElementById(`block-${idx + 1}`);
      if (el) el.focus();
    }, 50);
  };

  const handleAffiliateLinkSelected = (link: { id: string; name: string; platform: string }) => {
    const idx = affiliateModal.insertIndex;
    const newBlocks = [...blocksRef.current];
    newBlocks[idx] = { type: 'affiliate-link', affiliateId: link.id, name: link.name, platform: link.platform } as any;
    newBlocks.splice(idx + 1, 0, { type: 'text', html: '' } as any);
    setBlocks(newBlocks);
    setAffiliateModal({ isOpen: false, insertIndex: -1 });
    setTimeout(() => {
      const el = document.getElementById(`block-${idx + 1}`);
      if (el) el.focus();
    }, 50);
  };

  const updateImageBlockField = (index: number, fields: Record<string, any>) => {
    const newBlocks = [...blocksRef.current];
    if (newBlocks[index] && (newBlocks[index] as any).type === 'image') {
      newBlocks[index] = { ...newBlocks[index], ...fields } as any;
      setBlocks(newBlocks);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault(); 
      if (onSave) {
        onSave();
      } else {
        const nativeForm = editorRef.current?.closest('form');
        if (nativeForm) nativeForm.requestSubmit(); 
      }
      return;
    }

    if (menuRef.current.isOpen) {
      if (e.key === 'Escape') {
        setMenu(m => ({ ...m, isOpen: false }));
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMenuIndex(prev => (prev + 1) % filteredCommandsRef.current.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMenuIndex(prev => (prev - 1 + filteredCommandsRef.current.length) % filteredCommandsRef.current.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommandsRef.current[menuIndexRef.current];
        if (cmd) insertBlock(cmd);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      
      const currentBlockType = (blocksRef.current[index] as any).type;
      const newBlocks = [...blocksRef.current];
      
      if (currentBlockType === 'bullet-list' || currentBlockType === 'numbered-list') {
          newBlocks.splice(index + 1, 0, { type: currentBlockType, html: '' } as any);
      } else {
          newBlocks.splice(index + 1, 0, { type: 'text', html: '' } as any);
      }

      setBlocks(newBlocks);
      setTimeout(() => {
        const el = document.getElementById(`block-${index + 1}`);
        if (el) el.focus();
      }, 50);
      
    } else if (e.key === 'Backspace') {
      const el = document.getElementById(`block-${index}`);
      if (el && el.textContent === '') {
        e.preventDefault();
        
        const currentBlockType = (blocksRef.current[index] as any).type;
        if (currentBlockType === 'bullet-list' || currentBlockType === 'numbered-list') {
            const currentBlocks = [...blocksRef.current];
            currentBlocks[index] = { type: 'text', html: '' } as any;
            setBlocks(currentBlocks);
            return;
        }

        const currentBlocks = blocksRef.current;
        const newBlocks = currentBlocks.filter((_, i) => i !== index);
        setBlocks(newBlocks);
        
        if (currentBlocks.length > 1) {
            setTimeout(() => {
            const prevEl = document.getElementById(`block-${index - 1}`);
            if (prevEl) {
                prevEl.focus();
                if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
                    const range = document.createRange();
                    range.selectNodeContents(prevEl);
                    range.collapse(false);
                    const sel = window.getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                }
            }
            }, 50);
        }
      }
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(blocksRef.current);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setBlocks(items);
  };

  const removeBlock = (index: number) => setBlocks(blocksRef.current.filter((_, i) => i !== index));
  const duplicateBlock = (index: number) => {
    const newBlocks = [...blocksRef.current];
    newBlocks.splice(index + 1, 0, JSON.parse(JSON.stringify(blocksRef.current[index])));
    setBlocks(newBlocks);
  };
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const currentBlocks = blocksRef.current;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentBlocks.length - 1) return;
    const newBlocks = [...currentBlocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    setBlocks(newBlocks);
  };

  const applyFormat = (command: string, e: React.MouseEvent) => {
    e.preventDefault(); 
    document.execCommand(command, false, undefined);
    setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const node = selection.anchorNode;
            const blockEl = node?.parentElement?.closest('[contenteditable="true"]');
            if (blockEl) {
                const idStr = blockEl.id;
                const index = parseInt(idStr.replace('block-', ''));
                if (!isNaN(index)) {
                    const newBlocks = [...blocksRef.current];
                    if (newBlocks[index]) {
                        const bType = (newBlocks[index] as any).type;
                        (newBlocks[index] as any).html = blockEl.innerHTML;
                        if (bType === 'heading') {
                            (newBlocks[index] as any).text = blockEl.textContent;
                        } else if (['quote', 'callout', 'code', 'bullet-list', 'numbered-list', 'html-embed'].includes(bType)) {
                            (newBlocks[index] as any).html = blockEl.innerHTML;
                        }
                    }
                    setBlocks(newBlocks);
                }
            }
        }
    }, 0);
  };

  const applyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = window.prompt('Nhập đường dẫn liên kết (URL):', 'https://');
    if (url) {
      document.execCommand('createLink', false, url);
      setTimeout(() => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
              const node = selection.anchorNode;
              const blockEl = node?.parentElement?.closest('[contenteditable="true"]');
              if (blockEl) {
                  const idStr = blockEl.id;
                  const index = parseInt(idStr.replace('block-', ''));
                  if (!isNaN(index)) {
                      const newBlocks = [...blocksRef.current];
                      if (newBlocks[index]) {
                          (newBlocks[index] as any).html = blockEl.innerHTML;
                      }
                      setBlocks(newBlocks);
                  }
              }
          }
      }, 0);
    }
  };

  return (
    <div className={isContentOnly ? "w-full bg-white relative" : "flex flex-col xl:flex-row w-full min-h-screen bg-gray-50/50"}>
      <div className={`flex-1 overflow-y-auto relative min-w-0 ${isContentOnly ? 'p-0' : 'p-4 md:p-8'}`}>
        <div ref={editorRef} className={`max-w-4xl mx-auto bg-white relative flex flex-col ${isContentOnly ? 'min-h-[250px] p-2 pl-12' : 'border border-gray-200 rounded-xl min-h-[600px] shadow-sm p-8 pl-20'}`}>
          
          {inlineToolbar.isOpen && (
            <div 
              className="absolute z-50 bg-gray-900 text-white rounded-md shadow-lg flex items-center p-1 space-x-1"
              style={{ top: inlineToolbar.top, left: inlineToolbar.left, transform: 'translateX(-50%)' }}
            >
              <button type="button" onMouseDown={(e) => applyFormat('bold', e)} className="p-1.5 w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded font-bold">B</button>
              <button type="button" onMouseDown={(e) => applyFormat('italic', e)} className="p-1.5 w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded italic">I</button>
              <button type="button" onMouseDown={(e) => applyFormat('underline', e)} className="p-1.5 w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded underline">U</button>
              <button type="button" onMouseDown={applyLink} className="p-1.5 w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded text-blue-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
              </button>
            </div>
          )}

          {menu.isOpen && (
            <div 
              className="absolute z-50 w-64 max-h-80 overflow-y-auto bg-white border border-gray-200 shadow-xl rounded-md py-1" 
              style={{ top: menu.top, left: menu.left }}
            >
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100 uppercase tracking-wider">Chọn Block</div>
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      i === menuIndex ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onMouseEnter={() => setMenuIndex(i)}
                    onClick={() => insertBlock(cmd)}
                  >
                    {cmd.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500 italic">Không tìm thấy khối nào</div>
              )}
            </div>
          )}

          {blocks.length === 0 ? (
            <div 
              className="flex-1 flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-gray-200 rounded-lg cursor-text text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors -ml-12"
              onClick={() => {
                setBlocks([{ type: 'text', html: '' } as any]);
                setTimeout(() => {
                  const el = document.getElementById('block-0');
                  if (el) el.focus();
                }, 50);
              }}
            >
              <p className="text-base font-medium">Trình soạn thảo trống</p>
              <p className="text-sm mt-1">Click vào đây và gõ / để thêm block</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="editor-droppable">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 flex-1 pb-32">
                    {blocks.map((block, index) => {
                      const bType = (block as any).type;
                      return (
                      <Draggable key={`block-drag-${index}`} draggableId={`block-drag-${index}`} index={index}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} className="relative group flex items-start">
                            
                            <div className="absolute right-[calc(100%+0.5rem)] top-0 opacity-0 group-hover:opacity-100 flex items-center bg-white border border-gray-200 rounded shadow-sm z-10 transition-opacity">
                              <div {...provided.dragHandleProps} className="p-1.5 text-gray-400 hover:text-gray-800 cursor-grab active:cursor-grabbing border-r border-gray-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path></svg></div>
                              <button type="button" onClick={() => moveBlock(index, 'up')} className="p-1.5 text-gray-400 hover:text-blue-600 border-r border-gray-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg></button>
                              <button type="button" onClick={() => moveBlock(index, 'down')} className="p-1.5 text-gray-400 hover:text-blue-600 border-r border-gray-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></button>
                              <button type="button" onClick={() => duplicateBlock(index)} className="p-1.5 text-gray-400 hover:text-green-600 border-r border-gray-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button>
                              <button type="button" onClick={() => removeBlock(index)} className="p-1.5 text-gray-400 hover:text-red-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>

                            <div className="flex-1 min-w-0">
                              {bType === 'text' || bType === 'heading' ? (
                                <EditableBlock
                                  block={block}
                                  index={index}
                                  onInput={handleInput}
                                  onKeyDown={handleKeyDown}
                                  placeholder={bType === 'heading' ? `Tiêu đề H${(block as any).level}...` : "Gõ '/' để chèn block..."}
                                  className={`outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 w-full min-h-[1.5rem] ${
                                    bType === 'heading' && (block as any).level === 2 ? 'text-2xl font-bold mt-2' :
                                    bType === 'heading' && (block as any).level === 3 ? 'text-xl font-bold mt-1' :
                                    bType === 'heading' && (block as any).level === 4 ? 'text-lg font-bold mt-1' :
                                    'text-gray-800 leading-relaxed'
                                  }`}
                                />
                              ) : bType === 'divider' ? (
                                 <hr className="my-4 border-t-2 border-gray-200" />
                              ) : bType === 'image' ? (
                                <div className="my-6 p-4 border border-gray-100 bg-gray-50/50 rounded-xl group/img relative">
                                  <div className={`flex w-full ${ (block as any).alignment === 'left' ? 'justify-start' : (block as any).alignment === 'right' ? 'justify-end' : 'justify-center' }`}>
                                    <div className={`${(block as any).alignment === 'full' ? 'w-full' : 'max-w-2xl'}`}>
                                      <img src={(block as any).src} alt={(block as any).alt} className="w-full h-auto rounded-lg shadow-sm border border-gray-200" />
                                    </div>
                                  </div>
                                  <div className="mt-2 text-center">
                                    <input type="text" placeholder="Thêm chú thích ảnh..." value={(block as any).caption || ''} onChange={(e) => updateImageBlockField(index, { caption: e.target.value })} className="w-full max-w-md mx-auto text-center bg-transparent outline-none text-xs text-gray-500 py-0.5"/>
                                  </div>
                                </div>
                              
                              ) : bType === 'post-link' ? (
                                <div className="my-4 p-4 border border-blue-200 bg-blue-50/30 rounded-xl flex items-center justify-between select-none">
                                  <div className="flex items-center space-x-3 min-w-0">
                                    <span className="bg-blue-600 text-white text-[10px] font-bold uppercase px-2 py-1 rounded tracking-wider shrink-0">Link nội bộ</span>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">{(block as any).title}</p>
                                    </div>
                                  </div>
                                </div>

                              ) : bType === 'affiliate-link' ? (
                                <AffiliateBlockPreview block={block} />

                              ) : bType === 'quote' ? (
                                <div className="my-4 pl-4 border-l-4 border-gray-300 bg-gray-50/50 py-2">
                                  <EditableBlock
                                    block={block}
                                    index={index}
                                    onInput={handleInput}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nhập nội dung trích dẫn..."
                                    className="outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 text-gray-700 italic text-lg leading-relaxed w-full min-h-[1.5rem]"
                                  />
                                </div>
                                
                              ) : bType === 'callout' ? (
                                <div className="my-4 p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg flex items-start space-x-3">
                                  <div className="shrink-0 mt-0.5 text-blue-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                  </div>
                                  <EditableBlock
                                    block={block}
                                    index={index}
                                    onInput={handleInput}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nhập nội dung lưu ý/cảnh báo..."
                                    className="outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-blue-300/80 text-blue-900 leading-relaxed w-full min-h-[1.5rem]"
                                  />
                                </div>

                              ) : bType === 'code' ? (
                                <div className="my-4 p-4 bg-gray-900 rounded-lg overflow-x-auto shadow-inner relative group/code">
                                  <div className="absolute top-2 right-3 text-[10px] text-gray-500 uppercase font-mono tracking-wider select-none">Mã Code</div>
                                  <EditableBlock
                                    block={block}
                                    index={index}
                                    onInput={handleInput}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nhập mã code của bạn vào đây..."
                                    className="outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600 text-gray-100 font-mono text-[13px] leading-relaxed whitespace-pre-wrap w-full min-h-[1.5rem]"
                                  />
                                </div>
                                
                              ) : bType === 'video-embed' ? (
                                <div className="my-4 p-4 border border-gray-200 bg-gray-50 rounded-xl">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <input
                                      type="text"
                                      placeholder="Dán đường link YouTube vào đây (VD: https://www.youtube.com/watch?v=...)"
                                      value={(block as any).src || ''}
                                      onChange={(e) => {
                                        const newBlocks = [...blocksRef.current];
                                        newBlocks[index] = { ...newBlocks[index], src: e.target.value } as any;
                                        setBlocks(newBlocks);
                                      }}
                                      className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                                    />
                                  </div>
                                  
                                  {(() => {
                                    const url = (block as any).src || '';
                                    let videoId = '';
                                    try {
                                      if (url.includes('youtube.com/watch?v=')) videoId = new URL(url).searchParams.get('v') || '';
                                      else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
                                    } catch (e) {}
                                    
                                    if (videoId) {
                                      return (
                                        <div className="aspect-video w-full max-w-2xl mx-auto rounded-lg overflow-hidden bg-black mt-4 shadow-sm">
                                          <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${videoId}`} frameBorder="0" allowFullScreen></iframe>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>

                              ) : bType === 'bullet-list' ? (
                                <div className="flex items-start my-1 group/list">
                                  <span className="select-none mr-3 mt-[9px] w-1.5 h-1.5 rounded-full bg-gray-800 shrink-0"></span>
                                  <EditableBlock
                                    block={block}
                                    index={index}
                                    onInput={handleInput}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nhập nội dung danh sách..."
                                    className="outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 text-gray-800 leading-relaxed w-full min-h-[1.5rem]"
                                  />
                                </div>

                              ) : bType === 'numbered-list' ? (
                                <div className="flex items-start my-1 group/list">
                                  <span className="select-none mr-2 font-medium text-gray-800 shrink-0 min-w-[1.5rem] text-right mt-0.5">
                                    {(() => {
                                      let count = 1;
                                      for (let i = index - 1; i >= 0; i--) {
                                        if ((blocks[i] as any).type === 'numbered-list') count++;
                                        else break;
                                      }
                                      return count + '.';
                                    })()}
                                  </span>
                                  <EditableBlock
                                    block={block}
                                    index={index}
                                    onInput={handleInput}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nhập nội dung..."
                                    className="outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 text-gray-800 leading-relaxed w-full min-h-[1.5rem]"
                                  />
                                </div>
                                
                              ) : bType === 'table' ? (
                                <div className="my-6 overflow-x-auto border border-gray-200 rounded-lg group/table relative">
                                    <table className="w-full text-left border-collapse">
                                        <tbody>
                                            {((block as any).rows || []).map((row: string[], rowIndex: number) => (
                                                <tr key={rowIndex} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                                                    {row.map((cell: string, colIndex: number) => (
                                                        <td key={colIndex} className="p-3 border-r border-gray-100 last:border-0 relative">
                                                            <input
                                                                type="text"
                                                                value={cell}
                                                                onChange={(e) => {
                                                                    const newBlocks = [...blocksRef.current];
                                                                    const newRows = [...(newBlocks[index] as any).rows];
                                                                    newRows[rowIndex] = [...newRows[rowIndex]];
                                                                    newRows[rowIndex][colIndex] = e.target.value;
                                                                    (newBlocks[index] as any).rows = newRows;
                                                                    setBlocks(newBlocks);
                                                                }}
                                                                className="w-full bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 p-1 rounded transition-colors text-sm"
                                                                placeholder="..."
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="p-2 bg-gray-50 flex gap-2 border-t border-gray-200 justify-end">
                                        <button type="button" onClick={() => {
                                            const newBlocks = [...blocksRef.current];
                                            const rows = (newBlocks[index] as any).rows;
                                            (newBlocks[index] as any).rows = rows.map((r: any[]) => [...r, '']);
                                            setBlocks(newBlocks);
                                        }} className="text-xs bg-white border border-gray-300 px-2 py-1.5 rounded hover:bg-gray-100 font-medium">Thêm cột</button>
                                        <button type="button" onClick={() => {
                                            const newBlocks = [...blocksRef.current];
                                            const rows = (newBlocks[index] as any).rows;
                                            const newRow = new Array(rows[0].length).fill('');
                                            (newBlocks[index] as any).rows = [...rows, newRow];
                                            setBlocks(newBlocks);
                                        }} className="text-xs bg-white border border-gray-300 px-2 py-1.5 rounded hover:bg-gray-100 font-medium">Thêm hàng</button>
                                    </div>
                                </div>
                                
                              ) : bType === 'html-embed' ? (
                                <div className="my-4 p-4 bg-gray-800 rounded-lg shadow-inner relative group/html">
                                  <div className="absolute top-2 right-3 text-[10px] text-gray-400 uppercase font-mono tracking-wider select-none">Mã HTML</div>
                                  <EditableBlock
                                    block={block}
                                    index={index}
                                    onInput={handleInput}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Dán mã HTML vào đây..."
                                    className="outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-500 text-green-400 font-mono text-[13px] leading-relaxed whitespace-pre-wrap w-full min-h-[1.5rem]"
                                  />
                                </div>

                              ) : (
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500 italic">
                                  [Khối {bType}]
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      {!isContentOnly && (
        <div className="w-full xl:w-[350px] 2xl:w-[400px] shrink-0 border-l border-gray-200 bg-white h-auto xl:h-screen sticky top-0 overflow-y-auto shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
          <SEOPanel 
            data={seoData}
            onChange={(updates) => setSeoData(prev => ({ ...prev, ...updates }))}
            wordCount={wordCount}
            onOpenFeaturedImage={() => setImageModal({ isOpen: true, insertIndex: -1, target: 'featured' })}
            onRemoveFeaturedImage={() => setSeoData(prev => ({ ...prev, featured_image: '' }))}
          />
        </div>
      )}

      <ImageModal isOpen={imageModal.isOpen} onClose={() => setImageModal({ isOpen: false, insertIndex: -1, target: 'block' })} onSelectImage={handleImageSelected} />
      <PostLinkModal isOpen={postLinkModal.isOpen} onClose={() => setPostLinkModal({ isOpen: false, insertIndex: -1 })} onSelect={handlePostLinkSelected} />
      <AffiliateLinkModal isOpen={affiliateModal.isOpen} onClose={() => setAffiliateModal({ isOpen: false, insertIndex: -1 })} onSelect={handleAffiliateLinkSelected} />

      {!isContentOnly && (
        <>
          <input type="hidden" name="content" value={JSON.stringify(blocks)} />
          <input type="hidden" name="title" value={seoData.title || ''} />
          <input type="hidden" name="slug" value={seoData.slug || ''} />
          <input type="hidden" name="type" value={seoData.type || 'pillar'} />
          <input type="hidden" name="status" value={seoData.status || 'draft'} />
          <input type="hidden" name="meta_description" value={seoData.meta_description || ''} />
          <input type="hidden" name="featured_image" value={seoData.featured_image || ''} />
          <input type="hidden" name="og_title" value={seoData.og_title || ''} />
          <input type="hidden" name="focus_keyword" value={seoData.focus_keyword || ''} />
          <input type="hidden" name="canonical_url" value={seoData.canonical_url || ''} />
          <input type="hidden" name="generate_toc" value={String(seoData.generate_toc)} />
        </>
      )}
    </div>
  );
}