"use client";

import { useState, useEffect } from "react";
import { FamilyTreeData, FamilyMember } from "@/types/family";
import { LayoutGrid, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FamilyTreeView from "./tree/FamilyTreeView";
import TimelineView from "./timeline/TimelineView";
import AddMemberDialog from "./forms/AddMemberDialog";
import MemberDetailsDialog from "./details/MemberDetailsDialog";
import { connectMembersAction } from '@/actions/family';

interface AppProps {
  initialData: FamilyTreeData;
}

type ViewMode = "tree" | "timeline";

export default function App({ initialData }: AppProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [data, setData] = useState<FamilyTreeData>(initialData);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  
  // State for pre-filling relationships
  const [initialParentId, setInitialParentId] = useState<string | undefined>(undefined);
  const [initialChildId, setInitialChildId] = useState<string | undefined>(undefined);
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null);

  // Update local state when initialData changes (after server revalidate)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleAddRelation = (sourceId: string, handleType: 'source' | 'target') => {
    // source handle (bottom) -> adding a child
    // target handle (top) -> adding a parent
    
    if (handleType === 'source') {
      setInitialParentId(sourceId);
      setInitialChildId(undefined);
    } else {
      setInitialParentId(undefined);
      setInitialChildId(sourceId);
    }
    setMemberToEdit(null);
    setIsAddMemberOpen(true);
  };

  const handleCloseAddDialog = () => {
    setIsAddMemberOpen(false);
    // Reset relationship state after dialog closes
    setTimeout(() => {
      setInitialParentId(undefined);
      setInitialChildId(undefined);
      setMemberToEdit(null);
    }, 300);
  };

  const handleEditMember = (member: FamilyMember) => {
    setMemberToEdit(member);
    setIsAddMemberOpen(true);
  };

  // Optimistic handler for adding a member
  const handleOptimisticAddMember = (newMember: FamilyMember) => {
    setData((prev) => {
      const updatedMembers = [...prev.members, newMember];
      
      const membersWithUpdatedRelationships = updatedMembers.map(m => {
        const copy = { ...m };
        if (newMember.parents.includes(m.id) && !m.children.includes(newMember.id)) {
           copy.children = [...m.children, newMember.id];
        }
        if (newMember.children.includes(m.id) && !m.parents.includes(newMember.id)) {
           copy.parents = [...m.parents, newMember.id];
        }
        return copy;
      });

      return {
        ...prev,
        members: membersWithUpdatedRelationships
      };
    });
  };

  const handleOptimisticUpdateMember = (updatedMember: FamilyMember) => {
    setData((prev) => {
       const index = prev.members.findIndex(m => m.id === updatedMember.id);
       if (index === -1) return prev;
       
       const newMembers = [...prev.members];
       newMembers[index] = { ...newMembers[index], ...updatedMember };
       
       return { ...prev, members: newMembers };
    });
  };

  // Optimistic handler for connecting members
  const handleOptimisticConnect = async (sourceId: string, targetId: string) => {
    setData(prev => {
      const members = prev.members.map(m => {
        if (m.id === sourceId) {
          if (!m.children.includes(targetId)) {
            return { ...m, children: [...m.children, targetId] };
          }
        }
        if (m.id === targetId) {
          if (!m.parents.includes(sourceId)) {
            return { ...m, parents: [...m.parents, sourceId] };
          }
        }
        return m;
      });
      return { ...prev, members };
    });

    await connectMembersAction(sourceId, targetId);
  };

  return (
    <div className="flex flex-col h-screen bg-stone-50 text-stone-900 font-sans">
      <AddMemberDialog 
        isOpen={isAddMemberOpen} 
        onClose={handleCloseAddDialog}
        initialParentId={initialParentId}
        initialChildId={initialChildId}
        memberToEdit={memberToEdit}
        onAddMemberOptimistic={handleOptimisticAddMember}
        onUpdateMemberOptimistic={handleOptimisticUpdateMember}
      />
      
      <MemberDetailsDialog
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onEdit={handleEditMember}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold">
            F
          </div>
          <h1 className="text-xl font-semibold text-stone-800 tracking-tight">Family Legacy</h1>
        </div>

        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-lg border border-stone-200">
          <button
            onClick={() => setViewMode("tree")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === "tree"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <LayoutGrid size={16} />
            Tree
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === "timeline"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <Calendar size={16} />
            Timeline
          </button>
        </div>

        <div>
          <button 
            onClick={() => {
              setInitialParentId(undefined);
              setInitialChildId(undefined);
              setMemberToEdit(null);
              setIsAddMemberOpen(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Add Member
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {viewMode === "tree" ? (
            <motion.div
              key="tree"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <FamilyTreeView 
                data={data} 
                onNodeClick={(member) => setSelectedMember(member)} 
                onAddRelation={handleAddRelation}
                onConnect={handleOptimisticConnect}
              />
            </motion.div>
          ) : (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <TimelineView 
                data={data} 
                onMemberClick={(member) => setSelectedMember(member)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
