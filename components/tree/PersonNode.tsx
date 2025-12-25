import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FamilyMember } from '@/types/family';
import { Leaf } from 'lucide-react';

interface PersonNodeProps {
  data: FamilyMember;
}

const PersonNode = ({ data }: PersonNodeProps) => {
  const birthYear = data.birthDate ? new Date(data.birthDate).getFullYear() : '?';
  const deathYear = data.deathDate ? new Date(data.deathDate).getFullYear() : '';
  const range = deathYear ? `${birthYear} - ${deathYear}` : `b. ${birthYear}`;

  const hasPhoto = data.media.find(m => m.type === 'image');

  return (
    <div className="relative group">
       {/* Leaf Decorations */}
       <div className="absolute -top-3 -left-3 text-green-600/80 transform -rotate-45 z-0 pointer-events-none">
          <Leaf size={24} fill="currentColor" />
       </div>
       <div className="absolute -bottom-2 -right-2 text-green-700/60 transform rotate-12 z-0 pointer-events-none">
          <Leaf size={20} fill="currentColor" />
       </div>

      <div className="relative z-10 px-4 py-3 shadow-md rounded-xl bg-[#fdfaf6] border-2 border-amber-900/10 w-64 transition-all hover:shadow-xl hover:border-amber-500/50 hover:-translate-y-1">
        {/* Parent Connection (Top) */}
        <Handle 
          type="target" 
          position={Position.Top} 
          id="top"
          className="!bg-amber-800 !w-3 !h-3 !border-2 !border-[#fdfaf6]" 
        />
        
        {/* Spouse Connection (Left) */}
        <Handle 
          type="source" 
          position={Position.Left} 
          id="left"
          className="!bg-amber-800/50 !w-2 !h-2 !border-none hover:!w-3 hover:!h-3 transition-all" 
        />

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-amber-900/10">
            {hasPhoto ? (
              <img src={hasPhoto.url} alt={data.firstName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-amber-800/60">
                {data.firstName[0]}{data.lastName[0]}
              </span>
            )}
          </div>
          
          <div className="flex flex-col overflow-hidden">
            <div className="font-bold text-amber-950 truncate font-serif text-lg">
              {data.firstName} {data.lastName}
            </div>
            {data.maidenName && (
              <div className="text-xs text-amber-800/80 font-serif italic -mt-1 mb-1">
                née {data.maidenName}
              </div>
            )}
            <div className="text-xs text-amber-800/60 font-medium font-mono tracking-wide">
              {range}
            </div>
            {data.bio && (
               <div className="text-[10px] text-stone-500 truncate mt-1 italic font-serif">
                 {data.bio}
               </div>
            )}
          </div>
        </div>

        {/* Spouse Connection (Right) */}
        <Handle 
          type="source" 
          position={Position.Right} 
          id="right"
          className="!bg-amber-800/50 !w-2 !h-2 !border-none hover:!w-3 hover:!h-3 transition-all" 
        />

        {/* Child Connection (Bottom) */}
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="bottom"
          className="!bg-amber-800 !w-3 !h-3 !border-2 !border-[#fdfaf6]" 
        />
      </div>
    </div>
  );
};

export default memo(PersonNode);
