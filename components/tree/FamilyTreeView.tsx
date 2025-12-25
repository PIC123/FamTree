import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  OnConnectStart,
  OnConnectEnd,
  OnNodeDrag,
  ConnectionMode,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { FamilyMember, FamilyTreeData } from '@/types/family';
import PersonNode from './PersonNode';
import MarriageNode from './MarriageNode';
import { updateNodePositionAction, connectSpousesAction, connectMembersAction, deleteRelationshipAction } from '@/actions/family';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface FamilyTreeViewProps {
  data: FamilyTreeData;
  onNodeClick: (member: FamilyMember) => void;
  onAddRelation: (sourceId: string, handleType: 'source' | 'target' | 'spouse', position?: { x: number, y: number }) => void;
  onConnect: (params: { source: string; target: string; sourceHandle: string | null; targetHandle: string | null }) => void;
}

const nodeTypes = {
  person: PersonNode,
  marriage: MarriageNode,
};

// Dimensions must match PersonNode.tsx styling
// w-64 = 16rem = 256px
// h-approx ~100px (depends on content, but 100 is a good center estimate)
const NODE_WIDTH = 256;
const NODE_HEIGHT = 100;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export default function FamilyTreeView({ data, onNodeClick, onAddRelation, onConnect }: FamilyTreeViewProps) {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // Ctrl Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) setIsCtrlPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) setIsCtrlPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Setup Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('family_tree_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_members',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
             const updated = payload.new as any;
             if (updated.position_x !== null && updated.position_y !== null) {
               setNodes((nds) => 
                 nds.map((node) => {
                   if (node.id === updated.id) {
                     return {
                       ...node,
                       position: { x: updated.position_x, y: updated.position_y }
                     };
                   }
                   return node;
                 })
               );
             }
          }
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
             router.refresh();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'relationships',
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setNodes, router]);

  // Initial Data Load & Layout
  useEffect(() => {
    // 1. Create Person Nodes
    let personNodes: Node[] = data.members.map((member) => ({
      id: member.id,
      type: 'person',
      data: { ...member },
      position: member.position || { x: 0, y: 0 },
      zIndex: 1, 
    }));

    // 2. Prepare Edges for Layout (Parent-Child only)
    const layoutEdges: Edge[] = [];
    data.members.forEach(member => {
        member.children.forEach(childId => {
             layoutEdges.push({ 
                id: `l-${member.id}-${childId}`, 
                source: member.id, 
                target: childId,
                data: { type: 'parent' }
             });
        });
    });

    // 3. Layout (only if positions are missing)
    const needsLayout = personNodes.some(n => n.position.x === 0 && n.position.y === 0);
    if (needsLayout) {
      const { nodes: layoutedNodes } = getLayoutedElements(personNodes, layoutEdges);
      personNodes = layoutedNodes.map(n => {
         const saved = data.members.find(m => m.id === n.id)?.position;
         if (saved && (saved.x !== 0 || saved.y !== 0)) return { ...n, position: saved };
         return n;
      });
    }

    // 4. Generate Marriage Nodes and Edges
    const finalNodes: Node[] = [...personNodes];
    const finalEdges: Edge[] = [];
    const processedSpousePairs = new Set<string>();

    data.members.forEach((member) => {
      const memberNode = personNodes.find(n => n.id === member.id);
      if (!memberNode) return;

      // Handle Spouses
      member.spouses.forEach((spouseId) => {
        // Use '_+_' as separator to safely split UUIDs later
        const pairId = [member.id, spouseId].sort().join('_+_');
        if (processedSpousePairs.has(pairId)) return;
        processedSpousePairs.add(pairId);

        const spouseNode = personNodes.find(n => n.id === spouseId);
        if (!spouseNode) return;

        // Visual calculation for correct straight line
        const isMemberLeft = memberNode.position.x < spouseNode.position.x;
        const leftNode = isMemberLeft ? memberNode : spouseNode;
        const rightNode = isMemberLeft ? spouseNode : memberNode;

        const midX = (memberNode.position.x + spouseNode.position.x) / 2;
        const midY = (memberNode.position.y + spouseNode.position.y) / 2;
        
        const marriageNodeId = `marriage-${pairId}`;
        
        // Add Overlay Marriage Node
        // Centered exactly between the two nodes
        // Width/2 = 128, Height/2 = 50
        finalNodes.push({
          id: marriageNodeId,
          type: 'marriage',
          data: { label: '' },
          // Center of nodes + half width/height offset
          position: { 
            x: midX + (NODE_WIDTH / 2) - 12, 
            y: midY + (NODE_HEIGHT / 2) - 12 
          }, 
          draggable: false,
          zIndex: 10, 
        });

        // SINGLE Straight Edge between Spouses
        finalEdges.push({
          id: `e-spouse-${pairId}`,
          source: leftNode.id,
          target: rightNode.id,
          sourceHandle: 'right',
          targetHandle: 'left',
          type: 'straight',
          style: { stroke: '#92400e', strokeWidth: 3, cursor: isCtrlPressed ? 'crosshair' : 'pointer' },
          data: { type: 'spouse', from: leftNode.id, to: rightNode.id },
          zIndex: 0,
        });

        // Add Child Edges from Marriage Node
        const children = data.members.filter(c => 
          c.parents.includes(member.id) && c.parents.includes(spouseId)
        );

        children.forEach(child => {
          finalEdges.push({
            id: `e-${marriageNodeId}-${child.id}`,
            source: marriageNodeId,
            target: child.id,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            type: 'default',
            style: { stroke: '#92400e', strokeWidth: 3, cursor: isCtrlPressed ? 'crosshair' : 'pointer' }, 
            data: { type: 'parent-dual', parents: [member.id, spouseId], child: child.id },
            zIndex: 0,
          });
        });
      });

      // Handle Single Parent Children
      member.children.forEach(childId => {
        const child = data.members.find(m => m.id === childId);
        if (!child) return;
        
        const otherParentId = child.parents.find(p => p !== member.id);
        const parentsAreSpouses = otherParentId && member.spouses.includes(otherParentId);
        
        if (!parentsAreSpouses) {
           finalEdges.push({
            id: `e-${member.id}-${childId}`,
            source: member.id,
            target: childId,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            type: 'default',
            style: { stroke: '#92400e', strokeWidth: 3, cursor: isCtrlPressed ? 'crosshair' : 'pointer' },
            data: { type: 'parent', from: member.id, to: childId },
            zIndex: 0,
          });
        }
      });
    });

    setNodes(finalNodes);
    setEdges(finalEdges);
  }, [data, setNodes, setEdges, isCtrlPressed]);

  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleType = useRef<'source' | 'target' | null>(null);
  const connectingHandleId = useRef<string | null>(null);

  const onConnectStartWithId: OnConnectStart = useCallback((_, { nodeId, handleType, handleId }) => {
    connectingNodeId.current = nodeId;
    connectingHandleType.current = handleType;
    connectingHandleId.current = handleId;
  }, []);

  const handleConnect = useCallback(
    (params: Connection) => {
      onConnect({
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle
      });
    },
    [onConnect]
  );

  const onConnectEndWithId: OnConnectEnd = useCallback(
    (event) => {
      const targetIsPane = (event.target as Element).classList.contains('react-flow__pane');
      
      if (targetIsPane && connectingNodeId.current && rfInstance) {
        let position = { x: 0, y: 0 };
        
        if (event instanceof MouseEvent || event instanceof TouchEvent) {
           const clientX = (event as any).clientX || (event as any).touches?.[0]?.clientX;
           const clientY = (event as any).clientY || (event as any).touches?.[0]?.clientY;
           if (clientX && clientY) {
             position = rfInstance.screenToFlowPosition({ x: clientX, y: clientY });
           }
        }

        if (connectingNodeId.current.startsWith('marriage-')) {
           onAddRelation(connectingNodeId.current, 'source', position); 
        } else {
           const isSideHandle = connectingHandleId.current === 'left' || connectingHandleId.current === 'right';
           if (isSideHandle) {
             onAddRelation(connectingNodeId.current, 'spouse', position);
           } else if (connectingHandleType.current === 'source') {
             onAddRelation(connectingNodeId.current, 'source', position); // Child
           } else {
             onAddRelation(connectingNodeId.current, 'target', position); // Parent
           }
        }
      }
      
      connectingNodeId.current = null;
      connectingHandleType.current = null;
      connectingHandleId.current = null;
    },
    [onAddRelation, rfInstance]
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (event, node) => {
       if (node.type === 'person') {
         updateNodePositionAction(node.id, node.position.x, node.position.y);
       }
    },
    []
  );

  const onEdgeClick = useCallback(
    async (event: React.MouseEvent, edge: Edge) => {
      if (event.ctrlKey || event.metaKey) {
        const meta = edge.data as any;
        if (!meta) return;

        if (confirm('Delete this connection?')) {
          if (meta.type === 'spouse') {
            await deleteRelationshipAction(meta.from, meta.to, 'spouse');
          } else if (meta.type === 'parent') {
            await deleteRelationshipAction(meta.from, meta.to, 'parent');
          } else if (meta.type === 'parent-dual') {
            await deleteRelationshipAction(meta.parents[0], meta.child, 'parent');
            await deleteRelationshipAction(meta.parents[1], meta.child, 'parent');
          }
        }
      }
    },
    []
  );

  return (
    <div className={`w-full h-full bg-[#f5f5f4] ${isCtrlPressed ? 'cursor-delete-mode' : ''}`}>
      <style>{`
        .cursor-delete-mode .react-flow__edge {
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>') 12 12, pointer !important;
        }
        .cursor-delete-mode .react-flow__edge:hover path {
          stroke: red !important;
          stroke-width: 4 !important;
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onConnectStart={onConnectStartWithId}
        onConnectEnd={onConnectEndWithId}
        onNodeClick={(_, node) => {
          if (node.type === 'person') {
            onNodeClick(node.data as unknown as FamilyMember);
          }
        }}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={onEdgeClick}
        onInit={setRfInstance}
        nodeTypes={nodeTypes}
        fitView
        connectionMode={ConnectionMode.Loose}
        className="bg-[#f5f5f4]"
        connectionLineStyle={{ stroke: '#92400e', strokeWidth: 3, strokeDasharray: '5,5' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#d6d3d1" />
        <Controls className="!bg-white !border-stone-200 !shadow-md !text-stone-600" />
      </ReactFlow>
    </div>
  );
}
