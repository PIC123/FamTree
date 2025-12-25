import React from 'react';
import { FamilyMember, FamilyTreeData } from '@/types/family';
import { motion } from 'framer-motion';

interface TimelineViewProps {
  data: FamilyTreeData;
  onMemberClick: (member: FamilyMember) => void;
}

export default function TimelineView({ data, onMemberClick }: TimelineViewProps) {
  // Sort members by birth date
  const sortedMembers = [...data.members].sort((a, b) => {
    const dateA = a.birthDate ? new Date(a.birthDate).getTime() : 0;
    const dateB = b.birthDate ? new Date(b.birthDate).getTime() : 0;
    return dateA - dateB;
  });

  return (
    <div className="w-full h-full overflow-y-auto bg-stone-50 py-12 px-4">
      <div className="max-w-4xl mx-auto relative">
        {/* Center Line */}
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-amber-200 transform md:-translate-x-1/2"></div>

        {sortedMembers.map((member, index) => {
          const birthYear = member.birthDate ? new Date(member.birthDate).getFullYear() : 'Unknown';
          const isEven = index % 2 === 0;

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative flex items-center mb-12 ${
                isEven ? 'md:flex-row-reverse' : 'md:flex-row'
              }`}
            >
              {/* Spacer for desktop alignment */}
              <div className="hidden md:block w-1/2"></div>

              {/* Dot on the line */}
              <div className="absolute left-4 md:left-1/2 w-4 h-4 bg-amber-600 rounded-full border-4 border-white shadow-sm transform -translate-x-1/2 z-10"></div>

              {/* Content Card */}
              <div className="w-full md:w-1/2 pl-12 md:pl-0 md:px-8">
                <div 
                  onClick={() => onMemberClick(member)}
                  className="bg-white p-6 rounded-xl shadow-md border border-stone-100 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full mb-2">
                    {birthYear}
                  </span>
                  <h3 className="text-xl font-bold text-stone-800">
                    {member.firstName} {member.lastName}
                  </h3>
                  {member.bio && (
                    <p className="text-stone-600 mt-2 text-sm line-clamp-3">
                      {member.bio}
                    </p>
                  )}
                  {member.media.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      {member.media.slice(0, 3).map((m) => (
                         <div key={m.id} className="w-12 h-12 bg-stone-100 rounded-lg overflow-hidden">
                           {m.type === 'image' && (
                             <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                           )}
                         </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
