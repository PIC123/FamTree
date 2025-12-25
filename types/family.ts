export type MediaType = 'image' | 'video' | 'audio' | 'note';

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string; // For now, could be a blob URL or external link
  title: string;
  content?: string; // For notes
  date?: string;
}

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  gender?: 'male' | 'female' | 'other';
  bio?: string;
  
  // Relationships
  parents: string[]; // IDs of parents
  spouses: string[]; // IDs of spouses
  children: string[]; // IDs of children
  
  media: MediaItem[];
}

export interface FamilyTreeData {
  members: FamilyMember[];
}

