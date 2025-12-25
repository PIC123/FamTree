'use server';

import { addMember, updateMember, deleteMember, addRelationship, addMediaToMember, addProfileImageToMember, updateMemberPosition } from '@/lib/data';
import { FamilyMember, MediaItem } from '@/types/family';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

// Replaced local file save with Supabase Storage
async function saveFileToSupabase(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Create unique filename
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${uuidv4()}.${ext}`;
  
  const { data, error } = await supabase
    .storage
    .from('family-media') // Bucket name
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase
    .storage
    .from('family-media')
    .getPublicUrl(filename);
    
  return publicUrl;
}

export async function createMember(formData: FormData) {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const birthDate = formData.get('birthDate') as string;
  const bio = formData.get('bio') as string;
  const gender = formData.get('gender') as 'male' | 'female' | 'other';
  
  const id = (formData.get('id') as string) || uuidv4();
  const parentId = formData.get('initialParentId') as string;
  const childId = formData.get('initialChildId') as string;

  const parents = parentId ? [parentId] : [];
  const children = childId ? [childId] : [];
  
  // Handle Profile Picture
  const profileImageFile = formData.get('profileImage') as File;
  const media: MediaItem[] = [];

  if (profileImageFile && profileImageFile.size > 0) {
    try {
      const url = await saveFileToSupabase(profileImageFile);
      media.push({
        id: uuidv4(),
        type: 'image',
        url,
        title: 'Profile Picture',
        date: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save profile image:', error);
    }
  }

  const newMember: FamilyMember = {
    id,
    firstName,
    lastName,
    birthDate,
    gender,
    bio,
    parents, 
    spouses: [],
    children,
    media
  };

  await addMember(newMember);
  revalidatePath('/');
  return newMember;
}

export async function updateMemberAction(id: string, formData: FormData) {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const birthDate = formData.get('birthDate') as string;
  const bio = formData.get('bio') as string;
  const gender = formData.get('gender') as 'male' | 'female' | 'other';
  
  // Handle Profile Picture Update
  const profileImageFile = formData.get('profileImage') as File;
  let newMediaItem: MediaItem | undefined;

  if (profileImageFile && profileImageFile.size > 0) {
    try {
      const url = await saveFileToSupabase(profileImageFile);
      newMediaItem = {
        id: uuidv4(),
        type: 'image',
        url,
        title: 'Profile Picture',
        date: new Date().toISOString()
      };
      
      await addProfileImageToMember(id, newMediaItem);
    } catch (error) {
      console.error('Failed to save profile image:', error);
    }
  }

  await updateMember(id, {
    firstName,
    lastName,
    birthDate,
    bio,
    gender
  });
  revalidatePath('/');
}

export async function deleteMemberAction(id: string) {
  await deleteMember(id);
  revalidatePath('/');
}

export async function connectMembersAction(sourceId: string, targetId: string) {
  await addRelationship(sourceId, targetId, 'parent');
  revalidatePath('/');
}

export async function uploadMediaAction(memberId: string, formData: FormData) {
  const file = formData.get('file') as File;
  if (!file || file.size === 0) return;

  try {
    const url = await saveFileToSupabase(file);
    const mediaItem: MediaItem = {
      id: uuidv4(),
      type: 'image',
      url,
      title: file.name,
      date: new Date().toISOString()
    };

    await addMediaToMember(memberId, mediaItem);
    revalidatePath('/');
    return mediaItem;
  } catch (error) {
    console.error('Failed to upload media:', error);
    throw error;
  }
}

export async function updateNodePositionAction(id: string, x: number, y: number) {
  await updateMemberPosition(id, x, y);
  revalidatePath('/');
}
