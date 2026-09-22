// Định nghĩa các type cố định
export type ProjectType = 'code' | 'seo' | 'editor' | '3D' | 'design' | 'writing' | 'research' | 'other';
export type ProjectStatus = 'active' | 'archived' | 'done';
export type NoteLabel = 'link' | 'code' | 'prompt' | 'note_thuong' | 'image';
export type AttachmentType = 'image' | 'file';

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  order: number;
  created_at: string;
}

export interface Project {
  id: string;
  folder_id: string | null;
  name: string;
  type: ProjectType;
  tags: string[];
  status: ProjectStatus;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface Note {
  id: string;
  project_id: string;
  content: string | null;
  label: NoteLabel;
  pinned: boolean;
  created_at: string;
  edited_at: string | null;
  metadata: Record<string, any>;
}

export interface Attachment {
  id: string;
  note_id: string;
  type: AttachmentType;
  url: string;
  thumbnail_url: string | null;
  file_name: string;
  size: number | null;
  mime_type: string | null;
  caption: string | null;
  created_at: string;
}