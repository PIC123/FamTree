import React, { useMemo } from 'react';
import { FamilyMember, FamilyTreeData } from '@/types/family';
import { motion } from 'framer-motion';

interface TimelineViewProps {
  data: FamilyTreeData;
  onMemberClick: (member: FamilyMember) => void;
}

const PIXELS_PER_YEAR = 24; // Spacing factor

export default function TimelineView({ data, onMemberClick }: TimelineViewProps) {
  // 1. Separate Dated vs Undated
  const { datedMembers, undatedMembers, minYear, maxYear } = useMemo(() => {
    const dated: { member: FamilyMember; date: Date; year: number }[] = [];
    const undated: FamilyMember[] = [];
    
    let min = new Date().getFullYear();
    let max = min;

    data.members.forEach(m => {
      if (m.birthDate) {
        const d = new Date(m.birthDate);
        const y = d.getFullYear();
        if (!isNaN(y)) {
          dated.push({ member: m, date: d, year: y });
          if (y < min) min = y;
          if (y > max) max = y;
        } else {
          undated.push(m);
        }
      } else {
        undated.push(m);
      }
    });

    // Sort dated members
    dated.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Add padding to range
    return { 
      datedMembers: dated, 
      undatedMembers: undated, 
      minYear: min - 10, 
      maxYear: max + 10 
    };
  }, [data.members]);

  const totalYears = maxYear - minYear;
  const totalHeight = totalYears * PIXELS_PER_YEAR;

  // Generate decades for ruler
  const decades = useMemo(() => {
    const d = [];
    const startDecade = Math.floor(minYear / 10) * 10;
    const endDecade = Math.ceil(maxYear / 10) * 10;
    for (let y = startDecade; y <= endDecade; y += 10) {
      d.push(y);
    }
    return d;
  }, [minYear, maxYear]);

  return (
    <div className="w-full h-full overflow-y-auto bg-stone-50">
      <div className="relative min-h-full">
        
        {/* Main Timeline Container */}
        <div 
          className="max-w-5xl mx-auto relative mb-32"
          style={{ height: `${totalHeight}px`, minHeight: '80vh' }}
        >
          {/* Central Axis Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 bg-amber-200/50 transform md:-translate-x-1/2"></div>

          {/* Decade Markers */}
          {decades.map(year => {
             const top = (year - minYear) * PIXELS_PER_YEAR;
             if (top < 0 || top > totalHeight) return null;
             
             return (
               <div 
                 key={year} 
                 className="absolute left-4 md:left-1/2 w-full transform md:-translate-x-1/2 flex items-center justify-start md:justify-center"
                 style={{ top: `${top}px` }}
               >
                 {/* Tick */}
                 <div className="absolute left-0 md:left-1/2 w-8 h-0.5 bg-amber-300 md:-ml-4"></div>
                 {/* Label */}
                 <div className="ml-10 md:ml-12 text-xs font-bold text-amber-800/40 font-mono">
                   {year}
                 </div>
               </div>
             );
          })}

          {/* Dated Members */}
          {datedMembers.map((item, index) => {
            const { member, year, date } = item;
            
            // Calculate Position
            // More precise: year + fraction of year (month/12)
            const fraction = date.getMonth() / 12;
            const preciseYear = year + fraction;
            const top = (preciseYear - minYear) * PIXELS_PER_YEAR;
            
            const isLeft = index % 2 === 1; // Alternate sides

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.4 }}
                className={`absolute w-full flex items-center ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                style={{ top: `${top}px` }}
              >
                {/* Spacer for desktop alignment */}
                <div className="hidden md:block w-1/2"></div>

                {/* Connection Dot on Axis */}
                <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-amber-600 rounded-full border-2 border-white shadow-sm transform -translate-x-1/2 z-20"></div>

                {/* Connecting Line to Card */}
                <div 
                  className={`hidden md:block absolute h-px bg-amber-300 w-12 top-1/2 transform -translate-y-1/2 z-0 ${isLeft ? 'right-1/2 mr-1.5' : 'left-1/2 ml-1.5'}`} 
                />

                {/* Content Card */}
                <div className={`w-full md:w-[45%] pl-12 md:pl-0 md:px-0 ${isLeft ? 'md:pr-16 md:mr-auto' : 'md:pl-16 md:ml-auto'}`}>
                  <div 
                    onClick={() => onMemberClick(member)}
                    className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-stone-200 hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group relative"
                  >
                    {/* Date Badge */}
                    <div className={`absolute top-4 ${isLeft ? 'right-full mr-3' : 'left-full ml-3'} hidden md:flex items-center`}>
                       <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full whitespace-nowrap shadow-sm border border-amber-100">
                         {date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                       </span>
                    </div>

                    {/* Mobile Date Badge */}
                    <div className="md:hidden mb-1">
                       <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                         {year}
                       </span>
                    </div>

                    <div className="flex gap-3 items-start">
                      {/* Profile Pic Thumb */}
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex-shrink-0 overflow-hidden border border-stone-100">
                         {member.media.find(m => m.type === 'image') ? (
                           <img src={member.media.find(m => m.type === 'image')?.url} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-bold">
                             {member.firstName[0]}
                           </div>
                         )}
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-stone-800 text-sm leading-tight group-hover:text-amber-700 transition-colors">
                          {member.firstName} {member.lastName}
                        </h3>
                        {member.maidenName && (
                          <div className="text-[10px] text-stone-500 italic">née {member.maidenName}</div>
                        )}
                         {member.bio && (
                          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                            {member.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Undated Members Section */}
        {undatedMembers.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 pb-24 border-t border-stone-200 pt-12">
            <h3 className="text-center text-stone-400 font-serif italic mb-8">Undated Family Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {undatedMembers.map(member => (
                 <motion.div
                    key={member.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    onClick={() => onMemberClick(member)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 hover:shadow-md cursor-pointer flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-stone-100 overflow-hidden flex-shrink-0">
                       {member.media.find(m => m.type === 'image') ? (
                           <img src={member.media.find(m => m.type === 'image')?.url} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold">
                             {member.firstName[0]}
                           </div>
                         )}
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-800">{member.firstName} {member.lastName}</h4>
                      <div className="text-xs text-stone-500">No birth date</div>
                    </div>
                 </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
