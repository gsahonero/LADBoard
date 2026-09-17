/**
 * Graph View — Interactive Declarative Knowledge Graph & Deterministic Policy Editor
 */

import React, { useState, useRef, useEffect } from 'react';
import { useLAD } from '../context/LADContext';
import { useI18n } from '../../core/i18n/i18n-context';
import { GitGraph, Plus, Shield, Sliders } from 'lucide-react';
import { LADGraphNode, LADGraphEdge } from '../../core/standard/types';

export const GraphView: React.FC = () => {
  const { nodes, edges, addGraphNode, addGraphEdge, updateGraphEdge } = useLAD();
  const { t } = useI18n();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<LADGraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<LADGraphEdge | null>(null);

  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeType, setNewNodeType] = useState<LADGraphNode['type']>('user');

  const [connectSource, setConnectSource] = useState('');
  const [connectTarget, setConnectTarget] = useState('');

  // Draw force-like static visual network on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Adjust for high-DPI screens
    const width = canvas.parentElement?.clientWidth || 600;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (nodes.length === 0) return;

    // Calculate node coordinates in circle layout
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.7;

    const positions = new Map<string, { x: number; y: number }>();
    nodes.forEach((node, idx) => {
      const angle = (idx / nodes.length) * 2 * Math.PI - Math.PI / 2;
      positions.set(node.node_id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });

    // Draw Edges
    edges.forEach((edge) => {
      const p1 = positions.get(edge.source);
      const p2 = positions.get(edge.target);
      if (!p1 || !p2) return;

      const isSelected = selectedEdge?.edge_id === edge.edge_id;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = isSelected ? '#026bc9' : '#94a3b8';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.stroke();

      // Draw edge label
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px sans-serif';
      ctx.fillText(edge.type, midX, midY - 4);
    });

    // Draw Nodes
    nodes.forEach((node) => {
      const pos = positions.get(node.node_id);
      if (!pos) return;

      const isSelected = selectedNode?.node_id === node.node_id;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 22 : 18, 0, 2 * Math.PI);

      if (node.type === 'user') ctx.fillStyle = '#026bc9';
      else if (node.type === 'agent') ctx.fillStyle = '#6366f1';
      else if (node.type === 'object') ctx.fillStyle = '#10b981';
      else ctx.fillStyle = '#f59e0b';

      ctx.fill();
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Text label
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label.substring(0, 14), pos.x, pos.y + 32);
    });
  }, [nodes, edges, selectedNode, selectedEdge]);

  const handleAddNode = async () => {
    if (!newNodeLabel.trim()) return;
    await addGraphNode(newNodeLabel.trim(), newNodeType);
    setNewNodeLabel('');
  };

  const handleAddEdge = async () => {
    if (!connectSource || !connectTarget || connectSource === connectTarget) return;
    await addGraphEdge(connectSource, connectTarget, 'collaborator', {
      notification: {
        modification: true,
      },
    });
    setConnectSource('');
    setConnectTarget('');
  };

  const handleTogglePolicy = async (edge: LADGraphEdge) => {
    const currentVal = edge.policies?.notification?.modification;
    const nextVal = !currentVal;
    await updateGraphEdge(edge.edge_id, {
      ...edge.policies,
      notification: {
        ...edge.policies?.notification,
        modification: nextVal,
      },
    });
    setSelectedEdge({
      ...edge,
      policies: {
        ...edge.policies,
        notification: {
          ...edge.policies?.notification,
          modification: nextVal,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <GitGraph className="w-5 h-5 text-lad-500" />
          {t('graphView.title')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('graphView.subtitle')}
        </p>
      </div>

      {/* Interactive Canvas */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            {t('graphView.nodesCount', { count: nodes.length })} •{' '}
            {t('graphView.edgesCount', { count: edges.length })}
          </span>
          <span className="text-[11px] text-slate-400">Click elements below to inspect</span>
        </div>

        <div className="w-full bg-slate-50 dark:bg-slate-950/60 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800/80">
          <canvas ref={canvasRef} className="w-full h-[380px] block" />
        </div>
      </div>

      {/* Graph Inspector & Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Node & Edge Selector List */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-lad-500" />
            {t('graphView.nodeDetails')}
          </h2>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {nodes.map((n) => (
              <button
                key={n.node_id}
                onClick={() => {
                  setSelectedNode(n);
                  setSelectedEdge(null);
                }}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between border transition-all ${
                  selectedNode?.node_id === n.node_id
                    ? 'bg-lad-50 dark:bg-lad-950/40 border-lad-500 text-lad-700 dark:text-lad-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="truncate">{n.label}</span>
                <span className="text-[10px] font-bold uppercase text-slate-400">{n.type}</span>
              </button>
            ))}
          </div>

          {/* Quick Node Add */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <input
              type="text"
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              placeholder="Node Label"
              className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white flex-1"
            />
            <select
              value={newNodeType}
              onChange={(e) => setNewNodeType(e.target.value as any)}
              className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="user">User</option>
              <option value="agent">Agent</option>
              <option value="domain">Domain</option>
            </select>
            <button
              onClick={handleAddNode}
              disabled={!newNodeLabel.trim()}
              className="px-2.5 py-1 text-xs font-semibold bg-lad-600 text-white rounded-lg disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Relationship Policies Editor */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            {t('graphView.edgeDetails')}
          </h2>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {edges.map((e) => {
              const srcNode = nodes.find((n) => n.node_id === e.source);
              const tgtNode = nodes.find((n) => n.node_id === e.target);
              const isSelected = selectedEdge?.edge_id === e.edge_id;

              return (
                <div
                  key={e.edge_id}
                  onClick={() => {
                    setSelectedEdge(e);
                    setSelectedNode(null);
                  }}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all space-y-1.5 ${
                    isSelected
                      ? 'border-lad-500 bg-lad-50/50 dark:bg-lad-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span>
                      {srcNode?.label || e.source} ↔ {tgtNode?.label || e.target}
                    </span>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">
                      {e.type}
                    </span>
                  </div>

                  {/* Policy Switch */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>{t('graphView.notificationRule')}</span>
                    <button
                      onClick={(evt) => {
                        evt.stopPropagation();
                        handleTogglePolicy(e);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        e.policies?.notification?.modification
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {e.policies?.notification?.modification ? 'ALLOWED' : 'DENIED'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Connect Edges */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <select
              value={connectSource}
              onChange={(e) => setConnectSource(e.target.value)}
              className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white flex-1"
            >
              <option value="">Source Node</option>
              {nodes.map((n) => (
                <option key={n.node_id} value={n.node_id}>
                  {n.label}
                </option>
              ))}
            </select>
            <select
              value={connectTarget}
              onChange={(e) => setConnectTarget(e.target.value)}
              className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white flex-1"
            >
              <option value="">Target Node</option>
              {nodes.map((n) => (
                <option key={n.node_id} value={n.node_id}>
                  {n.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddEdge}
              disabled={!connectSource || !connectTarget}
              className="px-2.5 py-1 text-xs font-semibold bg-lad-600 text-white rounded-lg disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
