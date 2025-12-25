import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const MarriageNode = () => {
  return (
    <div 
      className="group relative flex items-center justify-center"
      style={{ width: 24, height: 24 }}
    >
      {/* Visual Dot - Centered */}
      <div className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-amber-800 border-2 border-white shadow-sm z-50 pointer-events-none" />
      
      {/* Hit Area & Handles */}
      {/* Handles are positioned centrally to ensure lines meet at the dot */}
      
      {/* Spouse Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left" 
        className="!opacity-0 !bg-transparent" 
        style={{ left: '50%', top: '50%', width: 1, height: 1, border: 'none' }} 
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right" 
        className="!opacity-0 !bg-transparent" 
        style={{ left: '50%', top: '50%', width: 1, height: 1, border: 'none' }} 
      />

      {/* Child Connection Handle (Source) */}
      {/* Making this cover the whole node for easier dragging */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        className="!opacity-0 !bg-transparent !w-full !h-full !top-0 !left-0 !transform-none !rounded-full !border-none z-50" 
      />
      
      {/* Tooltip */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[60]">
        Drag to add child
      </div>
    </div>
  );
};

export default memo(MarriageNode);
