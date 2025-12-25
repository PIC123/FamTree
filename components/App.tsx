'use client';

import { useEffect, useState } from 'react';
import FamilyTreeView from './tree/FamilyTreeView';
import TimelineView from './timeline/TimelineView';
import AddMemberDialog from './forms/AddMemberDialog';
import MemberDetailsDialog from './details/MemberDetailsDialog';
import { FamilyTreeData, FamilyMember } from '@/types/family';
import { createMember, connectMembersAction, connectSpousesAction } from '@/actions/family';

interface AppProps {
  initialData: FamilyTreeData;
}

export default function App({ initialData }: AppProps) {
  const [viewMode, setViewMode] = useState<'tree' | 'timeline'>('tree');
  const [data, setData] = useState<FamilyTreeData>(initialData);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [initialParentId, setInitialParentId] = useState<string | undefined>(undefined);
  const [initialSecondParentId, setInitialSecondParentId] = useState<string | undefined>(undefined);
  const [initialChildId, setInitialChildId] = useState<string | undefined>(undefined);
  const [initialSpouseId, setInitialSpouseId] = useState<string | undefined>(undefined);
  const [initialPosition, setInitialPosition] = useState<{ x: number, y: number } | undefined>(undefined);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleAddMember = (parentId?: string, childId?: string) => {
    setInitialParentId(parentId);
    setInitialSecondParentId(undefined); // Reset
    setInitialChildId(childId);
    setInitialSpouseId(undefined); // Reset
    setInitialPosition(undefined);
    setMemberToEdit(null);
    setIsAddMemberOpen(true);
  };

  const handleAddRelation = (sourceId: string, type: 'source' | 'target' | 'spouse', position?: { x: number, y: number }) => {
    // If dragging from a marriage node (sourceId starts with 'marriage-'), we are adding a child to BOTH parents
    if (sourceId.startsWith('marriage-')) {
      const parents = sourceId.replace('marriage-', '').split('_+_');
      if (parents.length === 2) {
        setInitialParentId(parents[0]);
        setInitialSecondParentId(parents[1]);
        setInitialChildId(undefined);
        setInitialSpouseId(undefined);
        setInitialPosition(position);
        setMemberToEdit(null);
        setIsAddMemberOpen(true);
        return;
      }
    }

    if (type === 'source') {
      // Dragging from bottom (source) -> adding a child
      setInitialParentId(sourceId);
      setInitialSecondParentId(undefined);
      setInitialChildId(undefined);
      setInitialSpouseId(undefined);
    } else if (type === 'target') {
      // Dragging from top (target) -> adding a parent
      setInitialParentId(undefined);
      setInitialSecondParentId(undefined);
      setInitialChildId(sourceId);
      setInitialSpouseId(undefined);
    } else if (type === 'spouse') {
       // Dragging from side -> adding a spouse
       setInitialParentId(undefined);
       setInitialSecondParentId(undefined);
       setInitialChildId(undefined);
       setInitialSpouseId(sourceId);
    }
    setInitialPosition(position);
    setMemberToEdit(null);
    setIsAddMemberOpen(true);
  };

  const handleEditMember = (member: FamilyMember) => {
    setMemberToEdit(member);
    setInitialParentId(undefined);
    setInitialSecondParentId(undefined);
    setInitialChildId(undefined);
    setInitialSpouseId(undefined);
    setInitialPosition(undefined);
    setIsAddMemberOpen(true);
    setSelectedMember(null); // Close details dialog
  };

  const handleOptimisticAddMember = (newMember: FamilyMember) => {
    setData(prev => {
      const updatedMembers = [...prev.members];
      
      // Update referenced parents
      newMember.parents.forEach(pId => {
        const parent = updatedMembers.find(m => m.id === pId);
        if (parent && !parent.children.includes(newMember.id)) {
          parent.children = [...parent.children, newMember.id];
        }
      });

      // Update referenced children
      newMember.children.forEach(cId => {
        const child = updatedMembers.find(m => m.id === cId);
        if (child && !child.parents.includes(newMember.id)) {
          child.parents = [...child.parents, newMember.id];
        }
      });

      // Update referenced spouses
      newMember.spouses.forEach(sId => {
        const spouse = updatedMembers.find(m => m.id === sId);
        if (spouse && !spouse.spouses.includes(newMember.id)) {
          spouse.spouses = [...spouse.spouses, newMember.id];
        }
      });

      updatedMembers.push(newMember);
      return { members: updatedMembers };
    });
  };

  const handleOptimisticUpdateMember = (updatedMember: FamilyMember) => {
     setData(prev => ({
       members: prev.members.map(m => m.id === updatedMember.id ? updatedMember : m)
     }));
  };

  const handleOptimisticConnect = (sourceId: string, targetId: string, type: 'parent' | 'spouse') => {
    setData(prev => {
      const updatedMembers = prev.members.map(m => {
        if (m.id === sourceId) {
          if (type === 'parent') {
             // Avoid duplicates
             if (!m.children.includes(targetId)) return { ...m, children: [...m.children, targetId] };
          }
          if (type === 'spouse') {
             if (!m.spouses.includes(targetId)) return { ...m, spouses: [...m.spouses, targetId] };
          }
        }
        if (m.id === targetId) {
          if (type === 'parent') {
             if (!m.parents.includes(sourceId)) return { ...m, parents: [...m.parents, sourceId] };
          }
          if (type === 'spouse') {
             if (!m.spouses.includes(sourceId)) return { ...m, spouses: [...m.spouses, sourceId] };
          }
        }
        return m;
      });

      return {
        members: updatedMembers
      };
    });
  };

  const onConnect = async (params: { source: string; target: string; sourceHandle: string | null; targetHandle: string | null }) => {
    const { source, target } = params;
    
    // Handle dragging from marriage node to existing child
    if (source.startsWith('marriage-')) {
       const parents = source.replace('marriage-', '').split('_+_');
       if (parents.length === 2) {
          // Connect BOTH parents to the child
          handleOptimisticConnect(parents[0], target, 'parent');
          handleOptimisticConnect(parents[1], target, 'parent');
          
          await connectMembersAction(parents[0], target);
          await connectMembersAction(parents[1], target);
          return;
       }
    }

    // Determine type based on handle or context
    // Default is parent-child (source is parent, target is child)
    let type: 'parent' | 'spouse' = 'parent';
    
    // If connecting with side handles, it's a spouse connection
    if (params.sourceHandle === 'right' || params.sourceHandle === 'left' || 
        params.targetHandle === 'right' || params.targetHandle === 'left') {
      type = 'spouse';
    }

    handleOptimisticConnect(source, target, type);
    
    if (type === 'spouse') {
      await connectSpousesAction(source, target);
    } else {
      await connectMembersAction(source, target);
    }
  };

  return (
    <div className="h-screen w-full bg-stone-50 flex flex-col font-sans text-stone-900">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 shadow-sm z-10 flex justify-between items-center">
        <h1 className="text-2xl font-serif font-bold text-amber-900">Family Tree</h1>
        
        <div className="flex items-center gap-4">
          <div className="bg-stone-100 p-1 rounded-lg flex gap-1">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'tree' 
                  ? 'bg-white text-amber-900 shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Tree View
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'timeline' 
                  ? 'bg-white text-amber-900 shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Timeline
            </button>
          </div>
          
          <button 
            onClick={() => handleAddMember()}
            className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            Add Member
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {viewMode === 'tree' ? (
          <FamilyTreeView 
            data={data} 
            onNodeClick={setSelectedMember}
            onAddRelation={handleAddRelation}
            onConnect={onConnect}
          />
        ) : (
          <TimelineView 
            data={data} 
            onMemberClick={setSelectedMember}
          />
        )}
      </main>

      {/* Dialogs */}
      <AddMemberDialog 
        isOpen={isAddMemberOpen} 
        onClose={() => setIsAddMemberOpen(false)}
        initialParentId={initialParentId}
        initialSecondParentId={initialSecondParentId}
        initialChildId={initialChildId}
        initialSpouseId={initialSpouseId}
        initialPosition={initialPosition}
        memberToEdit={memberToEdit}
        onAddMemberOptimistic={handleOptimisticAddMember}
        onUpdateMemberOptimistic={handleOptimisticUpdateMember}
      />
      
      <MemberDetailsDialog 
        member={selectedMember} 
        onClose={() => setSelectedMember(null)} 
        onEdit={handleEditMember}
      />
    </div>
  );
}
