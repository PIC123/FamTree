'use server';

import { addMember, updateMember, deleteMember, addRelationship, addMediaToMember, addProfileImageToMember, updateMemberPosition, deleteRelationship } from '@/lib/data';
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
  const maidenName = formData.get('maidenName') as string;
  const birthDate = formData.get('birthDate') as string;
  const bio = formData.get('bio') as string;
  const gender = formData.get('gender') as 'male' | 'female' | 'other';
  
  const id = (formData.get('id') as string) || uuidv4();
  const parentId = formData.get('initialParentId') as string;
  const secondParentId = formData.get('initialSecondParentId') as string; // New
  const childId = formData.get('initialChildId') as string;
  const spouseId = formData.get('initialSpouseId') as string;

  const parents = [];
  if (parentId) parents.push(parentId);
  if (secondParentId) parents.push(secondParentId);

  const children = childId ? [childId] : [];
  const spouses = spouseId ? [spouseId] : [];
  
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
    maidenName,
    birthDate,
    gender,
    bio,
    parents, 
    spouses,
    children,
    media
  };

  // If we have a second parent, we might want to calculate an initial position
  // But position is usually set by drag end in optimistic update.
  // We should accept position from FormData if provided?
  // The user said "not connected to anything in the wrong spot".
  // If we save position now, it persists.
  const posX = parseFloat(formData.get('positionX') as string);
  const posY = parseFloat(formData.get('positionY') as string);
  
  if (!isNaN(posX) && !isNaN(posY)) {
    newMember.position = { x: posX, y: posY };
  }

  await addMember(newMember);
  
  // If we have position, save it (addMember doesn't save position by default in current data.ts implementation?
  // Let's check data.ts addMember. It inserts into family_members.
  // We need to update addMember in data.ts to handle position OR call updateMemberPosition here.
  if (newMember.position) {
    await updateMemberPosition(newMember.id, newMember.position.x, newMember.position.y);
  }

  revalidatePath('/');
  return newMember;
}

export async function updateMemberAction(id: string, formData: FormData) {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const maidenName = formData.get('maidenName') as string;
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
    maidenName,
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

export async function connectSpousesAction(sourceId: string, targetId: string) {
  await addRelationship(sourceId, targetId, 'spouse');
  revalidatePath('/');
}

export async function deleteRelationshipAction(sourceId: string, targetId: string, type: 'parent' | 'child' | 'spouse') {
  await deleteRelationship(sourceId, targetId, type);
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
