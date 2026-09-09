'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { GraphData } from '@/types';

interface DependencyGraphProps {
  data: GraphData;
  className?: string;
}

interface Node {
  id: string;
  x: number;
  y: number;
  name: string;
  version: string;
  is_direct: boolean;
  is_vulnerable: boolean;
  depth: number;
}

export function DependencyGraph({ data, className }: DependencyGraphProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);
  const [dimensions] = React.useState({ width: 800, height: 600 });

  const nodes = React.useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const width = dimensions.width;
    const height = dimensions.height;
    const padding = 60;

    // Group nodes by depth
    const depthGroups = new Map<number, string[]>();
    data.nodes.forEach((node) => {
      const depth = node.depth || 0;
      if (!depthGroups.has(depth)) {
        depthGroups.set(depth, []);
      }
      depthGroups.get(depth)!.push(node.id);
    });

    // Position nodes by depth level
    const maxDepth = Math.max(...depthGroups.keys(), 0);
    const levelHeight = (height - padding * 2) / Math.max(maxDepth, 1);

    depthGroups.forEach((nodeIds, depth) => {
      const levelWidth = (width - padding * 2) / Math.max(nodeIds.length, 1);
      nodeIds.forEach((id, index) => {
        const nodeData = data.nodes.find((n) => n.id === id);
        if (nodeData) {
          nodeMap.set(id, {
            id,
            x: padding + levelWidth * (index + 0.5),
            y: padding + levelHeight * depth,
            name: nodeData.name,
            version: nodeData.version,
            is_direct: nodeData.is_direct,
            is_vulnerable: nodeData.is_vulnerable,
            depth: nodeData.depth,
          });
        }
      });
    });

    return nodeMap;
  }, [data.nodes, dimensions]);

  const edges = React.useMemo(() => {
    return data.edges.map((edge) => ({
      source: nodes.get(edge.source),
      target: nodes.get(edge.target),
    })).filter((e) => e.source && e.target);
  }, [data.edges, nodes]);

  const getNodeColor = (node: Node) => {
    if (node.is_vulnerable) return '#ef4444'; // red
    if (node.is_direct) return '#3b82f6'; // blue
    return '#6b7280'; // gray
  };

  const getNodeRadius = (node: Node) => {
    if (node.is_vulnerable) return 12;
    if (node.is_direct) return 10;
    return 8;
  };

  const isHighlighted = (nodeId: string) => {
    if (!hoveredNode && !selectedNode) return true;
    if (nodeId === hoveredNode || nodeId === selectedNode) return true;
    // Highlight connected nodes
    return data.edges.some(
      (e) =>
        (e.source === hoveredNode || e.source === selectedNode || 
         e.target === hoveredNode || e.target === selectedNode) &&
        (e.source === nodeId || e.target === nodeId)
    );
  };

  const selectedNodeData = selectedNode ? nodes.get(selectedNode) : null;

  return (
    <div className={cn('relative', className)}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="border rounded-lg bg-background"
      >
        {/* Edges */}
        <g className="edges">
          {edges.map((edge, i) => {
            const source = edge.source!;
            const target = edge.target!;
            const highlighted =
              !hoveredNode && !selectedNode
                ? true
                : source.id === hoveredNode ||
                  source.id === selectedNode ||
                  target.id === hoveredNode ||
                  target.id === selectedNode;

            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={highlighted ? '#6366f1' : '#374151'}
                strokeWidth={highlighted ? 2 : 1}
                strokeOpacity={highlighted ? 0.8 : 0.3}
                markerEnd="url(#arrowhead)"
              />
            );
          })}
        </g>

        {/* Arrow marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
          </marker>
        </defs>

        {/* Nodes */}
        <g className="nodes">
          {Array.from(nodes.values()).map((node) => {
            const radius = getNodeRadius(node);
            const color = getNodeColor(node);
            const highlighted = isHighlighted(node.id);

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() =>
                  setSelectedNode(
                    selectedNode === node.id ? null : node.id
                  )
                }
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={color}
                  fillOpacity={highlighted ? 1 : 0.3}
                  stroke={selectedNode === node.id ? '#fff' : color}
                  strokeWidth={selectedNode === node.id ? 3 : 1}
                />
                <text
                  x={node.x}
                  y={node.y + radius + 14}
                  textAnchor="middle"
                  className="fill-foreground text-[10px]"
                  fillOpacity={highlighted ? 1 : 0.3}
                >
                  {node.name.length > 15
                    ? node.name.substring(0, 15) + '...'
                    : node.name}
                </text>
                <text
                  x={node.x}
                  y={node.y + radius + 26}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px]"
                  fillOpacity={highlighted ? 1 : 0.3}
                >
                  v{node.version}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredNode && !selectedNode && (() => {
        const node = nodes.get(hoveredNode);
        if (!node) return null;
        return (
          <div
            className="absolute top-2 left-2 bg-card border rounded-lg p-3 shadow-lg text-sm pointer-events-none"
          >
            <div className="font-medium">{node.name}</div>
            <div className="text-muted-foreground text-xs">v{node.version}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getNodeColor(node) }}
              />
              <span className="text-xs">
                {node.is_vulnerable
                  ? 'Vulnerable'
                  : node.is_direct
                  ? 'Directa'
                  : 'Transitiva'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Selected node panel */}
      {selectedNodeData && (
        <div className="absolute top-2 right-2 bg-card border rounded-lg p-4 shadow-lg text-sm w-64">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Detalles</span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Paquete:</span>
              <p className="font-mono">{selectedNodeData.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Versión:</span>
              <p className="font-mono">v{selectedNodeData.version}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Profundidad:</span>
              <p>{selectedNodeData.depth}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getNodeColor(selectedNodeData) }}
              />
              <span>
                {selectedNodeData.is_vulnerable
                  ? 'Vulnerable'
                  : selectedNodeData.is_direct
                  ? 'Dependencia directa'
                  : 'Dependencia transitiva'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-card border rounded-lg p-3 shadow-lg text-xs">
        <div className="font-medium mb-2">Leyenda</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>Vulnerable</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Directa</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-500" />
            <span>Transitiva</span>
          </div>
        </div>
      </div>
    </div>
  );
}
