import React, { useCallback, useRef, useEffect } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { FamilyMember, FamilyTreeData } from '@/types/family';
import PersonNode from './PersonNode';

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
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes, edges };
};

export default function FamilyTreeView({ data, onNodeClick, onAddRelation, onConnect }: FamilyTreeViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Recalculate layout whenever data changes
  useEffect(() => {
    const initialNodes: Node[] = data.members.map((member) => ({
      id: member.id,
      type: 'person',
      data: member,
      position: { x: 0, y: 0 },
    }));

    const initialEdges: Edge[] = [];
    data.members.forEach((member) => {
      member.children.forEach((childId) => {
        initialEdges.push({
          id: `e${member.id}-${childId}`,
          source: member.id,
          target: childId,
          type: 'default', // Using default bezier for branch look
          animated: false,
          style: { 
            stroke: '#92400e', // Amber-800
            strokeWidth: 3,
          },
        });
      });
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
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
        onNodeClick={(_, node) => onNodeClick(node.data as FamilyMember)}
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
