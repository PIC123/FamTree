import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Video, Mic, FileText, Plus, Trash2, Edit2 } from 'lucide-react';
import { FamilyMember, MediaItem } from '@/types/family';
import { deleteMemberAction, uploadMediaAction } from '@/actions/family';

interface MemberDetailsDialogProps {
  member: FamilyMember | null;
  onClose: () => void;
  onEdit: (member: FamilyMember) => void;
}

export default function MemberDetailsDialog({ member, onClose, onEdit }: MemberDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'media'>('info');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!member) return null;

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this family member? This cannot be undone.')) {
      setIsDeleting(true);
      await deleteMemberAction(member.id);
      setIsDeleting(false);
      onClose();
    }
  };

  const handleEdit = () => {
    onEdit(member);
    onClose(); // Close details to open edit dialog (or keep both if we want, but cleaner to close)
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await uploadMediaAction(member.id, formData);
    } catch (error) {
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-amber-200 flex items-center justify-center text-2xl font-bold text-amber-800 overflow-hidden">
               {member.media.find(m => m.type === 'image') ? (
                 <img 
                   src={member.media.find(m => m.type === 'image')?.url} 
                   alt={member.firstName} 
                   className="w-full h-full object-cover"
                 />
               ) : (
                 member.firstName[0]
               )}
             </div>
             <div>
               <h2 className="text-2xl font-bold text-stone-800">{member.firstName} {member.lastName}</h2>
               <p className="text-stone-500">
                 {member.birthDate} {member.deathDate ? ` - ${member.deathDate}` : ''}
               </p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleEdit}
              className="p-2 text-stone-500 hover:bg-stone-200 rounded-full transition-colors"
              title="Edit Member"
            >
              <Edit2 size={20} />
            </button>
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Delete Member"
            >
              <Trash2 size={20} />
            </button>
            <button onClick={onClose} className="text-stone-500 hover:text-stone-700 p-2 hover:bg-stone-200 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'info' 
                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50' 
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            Information
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'media' 
                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50' 
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            Media & Memories
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50/30">
          {activeTab === 'info' ? (
            <div className="space-y-6">
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Biography</h3>
                </div>
                <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {member.bio || "No biography added yet."}
                </p>
              </section>
              
              <section className="grid grid-cols-2 gap-6">
                <div>
                   <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Born</h3>
                   <p className="text-stone-800 font-medium">{member.birthDate || 'Unknown'}</p>
                </div>
                <div>
                   <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Gender</h3>
                   <p className="text-stone-800 font-medium capitalize">{member.gender || 'Unknown'}</p>
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Add New Media Button */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all group disabled:opacity-50"
                >
                  <Plus size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">{isUploading ? 'Uploading...' : 'Add Media'}</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />

                {member.media.map((item) => (
                  <div key={item.id} className="aspect-square rounded-xl bg-white border border-stone-200 overflow-hidden relative group shadow-sm">
                    {item.type === 'image' && (
                      <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white p-2 text-center">
                      <span className="text-xs font-medium">{item.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
