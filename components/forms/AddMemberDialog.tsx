import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { createMember, updateMemberAction } from '@/actions/family';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { FamilyMember, MediaItem } from '@/types/family';

interface AddMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialParentId?: string;
  initialChildId?: string;
  memberToEdit?: FamilyMember | null;
  onAddMemberOptimistic?: (member: FamilyMember) => void;
  onUpdateMemberOptimistic?: (member: FamilyMember) => void;
}

export default function AddMemberDialog({ 
  isOpen, 
  onClose, 
  initialParentId, 
  initialChildId,
  memberToEdit,
  onAddMemberOptimistic,
  onUpdateMemberOptimistic
}: AddMemberDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Reset state when opening/closing or changing edit mode
  useEffect(() => {
    if (isOpen) {
      if (memberToEdit) {
        // Pre-fill for edit
        const profilePic = memberToEdit.media.find(m => m.type === 'image');
        setPreviewUrl(profilePic ? profilePic.url : null);
      } else {
        // Reset for add
        setPreviewUrl(null);
      }
    }
  }, [isOpen, memberToEdit]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    
    if (memberToEdit) {
      // Handle Edit
      if (onUpdateMemberOptimistic) {
        const updatedMember = { ...memberToEdit };
        updatedMember.firstName = formData.get('firstName') as string;
        updatedMember.lastName = formData.get('lastName') as string;
        updatedMember.birthDate = formData.get('birthDate') as string;
        updatedMember.gender = formData.get('gender') as any;
        updatedMember.bio = formData.get('bio') as string;
        
        if (previewUrl && previewUrl !== memberToEdit.media.find(m => m.type === 'image')?.url) {
           // If new image uploaded (blob url), optimistic update might be tricky for image
           // but we can try showing it.
           // For simplicity, we might skip full media optimistic update for edit
           // or just add a temp one.
        }
        onUpdateMemberOptimistic(updatedMember);
      }

      await updateMemberAction(memberToEdit.id, formData);

    } else {
      // Handle Create
      const id = uuidv4();
      formData.append('id', id);

      const parents = initialParentId ? [initialParentId] : [];
      const children = initialChildId ? [initialChildId] : [];
      
      if (initialParentId) formData.append('initialParentId', initialParentId);
      if (initialChildId) formData.append('initialChildId', initialChildId);
      
      if (onAddMemberOptimistic) {
        const media: MediaItem[] = [];
        if (previewUrl) {
          media.push({
            id: uuidv4(),
            type: 'image',
            url: previewUrl,
            title: 'Profile Picture',
            date: new Date().toISOString()
          });
        }

        const optimisticMember: FamilyMember = {
          id,
          firstName: formData.get('firstName') as string,
          lastName: formData.get('lastName') as string,
          birthDate: formData.get('birthDate') as string,
          gender: formData.get('gender') as any,
          bio: formData.get('bio') as string,
          parents,
          children,
          spouses: [],
          media
        };
        onAddMemberOptimistic(optimisticMember);
      }

      await createMember(formData);
    }
    
    setIsSubmitting(false);
    onClose();
    setPreviewUrl(null);
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-800">
            {memberToEdit 
              ? 'Edit Family Member' 
              : initialParentId 
                ? 'Add Child' 
                : initialChildId 
                  ? 'Add Parent' 
                  : 'Add Family Member'
            }
          </h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-700">
            <X size={20} />
          </button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-stone-100 border-2 border-stone-200 flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="text-stone-400" size={32} />
                )}
              </div>
              <input
                type="file"
                name="profileImage"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Upload Profile Picture"
              />
              <div className="absolute bottom-0 right-0 bg-amber-600 text-white p-1 rounded-full shadow-md">
                <Upload size={12} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">First Name</label>
              <input
                name="firstName"
                required
                defaultValue={memberToEdit?.firstName}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Last Name</label>
              <input
                name="lastName"
                required
                defaultValue={memberToEdit?.lastName}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Birth Date</label>
            <input
              type="date"
              name="birthDate"
              defaultValue={memberToEdit?.birthDate}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Gender</label>
            <select
              name="gender"
              defaultValue={memberToEdit?.gender || 'male'}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Bio</label>
            <textarea
              name="bio"
              rows={3}
              defaultValue={memberToEdit?.bio}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            ></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (memberToEdit ? 'Saving...' : 'Adding...') : (memberToEdit ? 'Save Changes' : 'Add Member')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
