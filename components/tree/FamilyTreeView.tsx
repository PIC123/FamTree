import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  OnConnectStart,
  OnConnectEnd,
  MarkerType,
  OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { FamilyMember, FamilyTreeData } from '@/types/family';
import PersonNode from './PersonNode';
import { updateNodePositionAction } from '@/actions/family';
import { supabase } from '@/lib/supabase';

interface FamilyTreeViewProps {
  data: FamilyTreeData;
  onNodeClick: (member: FamilyMember) => void;
  onAddRelation: (sourceId: string, handleType: 'source' | 'target') => void;
  onConnect: (sourceId: string, targetId: string) => void;
}

const nodeTypes = {
  person: PersonNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 256;
  const nodeHeight = 100;

  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    // Only set position if not already set (custom override logic handled in component)
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes, edges };
};

export default function FamilyTreeView({ data, onNodeClick, onAddRelation, onConnect }: FamilyTreeViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

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
          // If a member is updated (e.g. position change), update local node
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setNodes]);

  // Initial Data Load & Layout
  useEffect(() => {
    // Separate nodes with saved positions vs those needing layout
    const initialNodes: Node[] = data.members.map((member) => ({
      id: member.id,
      type: 'person',
      data: { ...member }, // Spread to satisfy Record<string, unknown>
      // Use saved position if available, otherwise default to 0,0 (will be layouted)
      position: member.position || { x: 0, y: 0 },
    }));

    const initialEdges: Edge[] = [];
    data.members.forEach((member) => {
      member.children.forEach((childId) => {
        initialEdges.push({
          id: `e${member.id}-${childId}`,
          source: member.id,
          target: childId,
          type: 'default',
          animated: false,
          style: { 
            stroke: '#92400e', 
            strokeWidth: 3,
          },
        });
      });
    });

    // Check if we need to run auto-layout
    // Run layout only on nodes that DON'T have a saved position
    // OR: for simplicity, if ANY node is missing position, run full layout?
    // Let's try: If mostly new, run layout.
    // Better: Run layout on a copy, then merge.
    // If a node has a saved position, respect it. If not, use layout position.
    
    const { nodes: layoutedNodes } = getLayoutedElements(
      // Pass simple copies for layout calculation
      initialNodes.map(n => ({...n})), 
      initialEdges
    );
    
    // Merge: saved position wins
    const finalNodes = initialNodes.map(n => {
      const savedPos = data.members.find(m => m.id === n.id)?.position;
      if (savedPos) {
        return { ...n, position: savedPos };
      }
      // Fallback to auto-layout position
      const layouted = layoutedNodes.find(ln => ln.id === n.id);
      return { ...n, position: layouted?.position || { x: 0, y: 0 } };
    });

    setNodes(finalNodes);
    setEdges(initialEdges);
  }, [data, setNodes, setEdges]);

  const connectingNodeId = useRef<string | null>(null);
  const connectingHandleType = useRef<'source' | 'target' | null>(null);

  const handleConnect = useCallback(
    async (params: Connection) => {
      if (params.source && params.target) {
        onConnect(params.source, params.target);
      }
    },
    [onConnect]
  );

  const onConnectStart: OnConnectStart = useCallback((_, { nodeId, handleType }) => {
    connectingNodeId.current = nodeId;
    connectingHandleType.current = handleType;
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      const targetIsPane = (event.target as Element).classList.contains('react-flow__pane');
      
      if (targetIsPane && connectingNodeId.current && connectingHandleType.current) {
        onAddRelation(connectingNodeId.current, connectingHandleType.current);
      }
      
      connectingNodeId.current = null;
      connectingHandleType.current = null;
    },
    [onAddRelation]
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (event, node) => {
       // Save new position to DB
       updateNodePositionAction(node.id, node.position.x, node.position.y);
    },
    []
  );

  return (
    <div className="w-full h-full bg-[#f5f5f4]"> 
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={(_, node) => onNodeClick(node.data as unknown as FamilyMember)}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#f5f5f4]"
        connectionLineStyle={{ stroke: '#92400e', strokeWidth: 3, strokeDasharray: '5,5' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#d6d3d1" />
        <Controls className="!bg-white !border-stone-200 !shadow-md !text-stone-600" />
      </ReactFlow>
    </div>
  );
}
