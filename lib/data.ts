import { supabase } from './supabase';
import { FamilyMember, FamilyTreeData, MediaItem } from '@/types/family';

// Fallback initial data if DB is empty
const INITIAL_DATA: FamilyTreeData = {
  members: [
    {
      id: '1',
      firstName: 'Grandpa',
      lastName: 'Smith',
      birthDate: '1940-01-01',
      gender: 'male',
      parents: [],
      spouses: ['2'],
      children: ['3'],
      media: [],
      bio: 'The patriarch of the family (Demo Data)'
    },
    // ... we can reduce initial data since we want real DB data
  ]
};

export async function getFamilyData(): Promise<FamilyTreeData> {
  // Try fetching from Supabase
  try {
    const { data: membersData, error: membersError } = await supabase
      .from('family_members')
      .select(`
        *,
        media (*)
      `);

    if (membersError) throw membersError;
    if (!membersData) return INITIAL_DATA;

    // We need to fetch relationships to construct parents/children/spouses arrays
    const { data: relationsData, error: relationsError } = await supabase
      .from('relationships')
      .select('*');
      
    if (relationsError) throw relationsError;

    // Transform DB shape to App shape
    const members: FamilyMember[] = membersData.map((m: any) => {
      const memberId = m.id;
      
      const parents = relationsData
        .filter((r: any) => r.to_member_id === memberId && r.type === 'parent')
        .map((r: any) => r.from_member_id);
        
      const children = relationsData
        .filter((r: any) => r.from_member_id === memberId && r.type === 'parent')
        .map((r: any) => r.to_member_id);
        
      const spouses = relationsData
        .filter((r: any) => 
          (r.from_member_id === memberId || r.to_member_id === memberId) && r.type === 'spouse'
        )
        .map((r: any) => r.from_member_id === memberId ? r.to_member_id : r.from_member_id);

      // Parse Position
      let position = undefined;
      if (m.position_x !== null && m.position_y !== null) {
        position = { x: m.position_x, y: m.position_y };
      }

      return {
        id: m.id,
        firstName: m.first_name,
        lastName: m.last_name,
        maidenName: m.maiden_name,
        birthDate: m.birth_date,
        deathDate: m.death_date,
        gender: m.gender,
        bio: m.bio,
        parents,
        children,
        spouses,
        media: m.media.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        position 
      };
    });

    return { members };
  } catch (error) {
    console.error('Error fetching family data:', error);
    return INITIAL_DATA;
  }
}

export async function addMember(member: FamilyMember): Promise<FamilyMember> {
  // Insert Member
  const { error: memberError } = await supabase
    .from('family_members')
    .insert({
      id: member.id,
      first_name: member.firstName,
      last_name: member.lastName,
      maiden_name: member.maidenName,
      birth_date: member.birthDate,
      death_date: member.deathDate,
      gender: member.gender,
      bio: member.bio,
      position_x: member.position?.x,
      position_y: member.position?.y
    });

  if (memberError) {
    console.error('Error adding member:', memberError);
    throw memberError;
  }

  // Insert Relationships
  const relationships = [];
  
  // Parents (parents are "from", this member is "to")
  for (const pId of member.parents) {
    relationships.push({ from_member_id: pId, to_member_id: member.id, type: 'parent' });
  }
  
  // Children (this member is "from", children are "to")
  for (const cId of member.children) {
    relationships.push({ from_member_id: member.id, to_member_id: cId, type: 'parent' });
  }

  // Spouses (this member is "from", spouse is "to")
  for (const sId of member.spouses) {
    relationships.push({ from_member_id: member.id, to_member_id: sId, type: 'spouse' });
  }

  if (relationships.length > 0) {
    const { error: relError } = await supabase
      .from('relationships')
      .insert(relationships);
      
    if (relError) console.error('Error adding relationships:', relError);
  }

  // Insert Media
  if (member.media && member.media.length > 0) {
    const mediaRows = member.media.map(m => ({
      id: m.id,
      member_id: member.id,
      type: m.type,
      url: m.url,
      title: m.title
    }));
    
    const { error: mediaError } = await supabase
      .from('media')
      .insert(mediaRows);
      
    if (mediaError) console.error('Error adding media:', mediaError);
  }

  return member;
}

export async function updateMember(id: string, updates: Partial<FamilyMember>): Promise<void> {
  const dbUpdates: any = {};
  if (updates.firstName) dbUpdates.first_name = updates.firstName;
  if (updates.lastName) dbUpdates.last_name = updates.lastName;
  if (updates.maidenName !== undefined) dbUpdates.maiden_name = updates.maidenName; 
  if (updates.birthDate) dbUpdates.birth_date = updates.birthDate;
  if (updates.deathDate) dbUpdates.death_date = updates.deathDate;
  if (updates.gender) dbUpdates.gender = updates.gender;
  if (updates.bio) dbUpdates.bio = updates.bio;

  const { error } = await supabase
    .from('family_members')
    .update(dbUpdates)
    .eq('id', id);

  if (error) console.error('Error updating member:', error);
}

export async function updateMemberPosition(id: string, x: number, y: number): Promise<void> {
  const { error } = await supabase
    .from('family_members')
    .update({ position_x: x, position_y: y })
    .eq('id', id);
    
  if (error) console.error('Error updating member position:', error);
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('id', id);

  if (error) console.error('Error deleting member:', error);
}

export async function deleteRelationship(fromId: string, toId: string, type: 'parent' | 'child' | 'spouse'): Promise<void> {
  let from = fromId;
  let to = toId;
  let relType = type;

  if (type === 'child') {
     from = toId;
     to = fromId;
     relType = 'parent';
  }

  // Delete matching relationship (try both directions for spouse)
  if (relType === 'spouse') {
    const { error } = await supabase
      .from('relationships')
      .delete()
      .or(`and(from_member_id.eq.${from},to_member_id.eq.${to}),and(from_member_id.eq.${to},to_member_id.eq.${from})`)
      .eq('type', 'spouse');
      
    if (error) console.error('Error deleting spouse relationship:', error);
  } else {
    const { error } = await supabase
      .from('relationships')
      .delete()
      .eq('from_member_id', from)
      .eq('to_member_id', to)
      .eq('type', relType);

    if (error) console.error('Error deleting relationship:', error);
  }
}

export async function addRelationship(fromId: string, toId: string, type: 'parent' | 'child' | 'spouse'): Promise<void> {
  let from = fromId;
  let to = toId;
  let relType = type;

  if (type === 'child') {
     from = toId;
     to = fromId;
     relType = 'parent';
  }

  // Check if exists (check both directions for spouse)
  let query = supabase
    .from('relationships')
    .select('*')
    .eq('type', relType);
    
  if (relType === 'spouse') {
    query = query.or(`and(from_member_id.eq.${from},to_member_id.eq.${to}),and(from_member_id.eq.${to},to_member_id.eq.${from})`);
  } else {
    query = query.eq('from_member_id', from).eq('to_member_id', to);
  }

  const { data: existing } = await query.single();

  if (!existing) {
    await supabase.from('relationships').insert({
      from_member_id: from,
      to_member_id: to,
      type: relType
    });
  }
}

export async function addProfileImageToMember(memberId: string, mediaItem: MediaItem): Promise<void> {
  const { error } = await supabase
    .from('media')
    .insert({
      id: mediaItem.id,
      member_id: memberId,
      type: mediaItem.type,
      url: mediaItem.url,
      title: mediaItem.title
    });

  if (error) console.error('Error adding profile image:', error);
}

export async function addMediaToMember(memberId: string, mediaItem: MediaItem): Promise<void> {
  await addProfileImageToMember(memberId, mediaItem);
}
