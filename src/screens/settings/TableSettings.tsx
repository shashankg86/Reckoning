import { ArrowPathIcon, PlusIcon, TrashIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import Draggable, { DraggableData } from 'react-draggable';
import toast from 'react-hot-toast';

import { tablesAPI } from '../../api/tables';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { Table, Zone } from '../../types/tables';

export default function TableSettings() {
    const { state } = useAuth();
    const [zones, setZones] = useState<Zone[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [deletedTableIds, setDeletedTableIds] = useState<string[]>([]);
    const [modifiedTableIds, setModifiedTableIds] = useState<Set<string>>(new Set());
    const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Edit Modal State
    const [editingTable, setEditingTable] = useState<Table | null>(null);

    const fetchData = useCallback(async () => {
        if (!state.user?.store?.id) return;
        try {
            setLoading(true);
            const [zonesData, tablesData] = await Promise.all([
                tablesAPI.getZones(state.user.store.id),
                tablesAPI.getTables(state.user.store.id)
            ]);
            setZones(zonesData);
            setTables(tablesData);
            setDeletedTableIds([]);
            setModifiedTableIds(new Set());
            setHasUnsavedChanges(false);

            if (zonesData.length > 0 && !activeZoneId) {
                setActiveZoneId(zonesData[0].id);
            }
        } catch (error) {
            console.error('Error fetching table settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    }, [state.user?.store?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddZone = async () => {
        const name = window.prompt('Enter zone name (e.g., Main Hall, Patio):');
        if (!name || !state.user?.store?.id) return;

        try {
            const newZone = await tablesAPI.createZone(state.user.store.id, name);
            setZones([...zones, newZone]);
            setActiveZoneId(newZone.id);
            toast.success('Zone created');
        } catch (error) {
            toast.error('Failed to create zone');
        }
    };

    const handleDeleteZone = async (zoneId: string) => {
        if (!window.confirm('Are you sure? This will delete all tables in this zone.')) return;
        try {
            await tablesAPI.deleteZone(zoneId);
            setZones(zones.filter(z => z.id !== zoneId));
            if (activeZoneId === zoneId) {
                setActiveZoneId(zones.length > 1 ? zones[0].id : null);
            }
            toast.success('Zone deleted');
        } catch (error) {
            toast.error('Failed to delete zone');
        }
    };

    const handleAddTable = (shape: 'rectangle' | 'circle') => {
        if (!activeZoneId || !state.user?.store?.id) return;

        const zoneTables = tables.filter(t => t.zone_id === activeZoneId);
        const tempId = `temp_${Date.now()}`;

        const newTable: Table = {
            id: tempId,
            store_id: state.user.store.id,
            zone_id: activeZoneId,
            name: `T-${zoneTables.length + 1}`,
            capacity: 4,
            shape,
            x: 50,
            y: 50,
            width: shape === 'circle' ? 100 : 120,
            height: 100,
            is_occupied: false,
            created_at: new Date().toISOString()
        };

        setTables([...tables, newTable]);
        setHasUnsavedChanges(true);
        setEditingTable(newTable);
    };

    const handleDragStop = (id: string, data: DraggableData) => {
        setTables(prev => prev.map(t => {
            if (t.id === id) {
                return { ...t, x: data.x, y: data.y };
            }
            return t;
        }));

        if (!id.startsWith('temp_')) {
            setModifiedTableIds(prev => new Set(prev).add(id));
        }
        setHasUnsavedChanges(true);
    };

    const handleDeleteTable = (id: string) => {
        if (!window.confirm('Delete this table?')) return;

        if (id.startsWith('temp_')) {
            setTables(prev => prev.filter(t => t.id !== id));
        } else {
            setTables(prev => prev.filter(t => t.id !== id));
            setDeletedTableIds(prev => [...prev, id]);
            setModifiedTableIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
        setHasUnsavedChanges(true);
    };

    const handleSaveLayout = async () => {
        setIsSaving(true);
        try {
            const promises = [];

            if (deletedTableIds.length > 0) {
                promises.push(...deletedTableIds.map(id => tablesAPI.deleteTable(id)));
            }

            const newTables = tables.filter(t => t.id.startsWith('temp_'));
            if (newTables.length > 0) {
                promises.push(...newTables.map(t => {
                    const { id, created_at, ...data } = t;
                    return tablesAPI.createTable(data);
                }));
            }

            const modifiedTables = tables.filter(t => !t.id.startsWith('temp_') && modifiedTableIds.has(t.id));
            if (modifiedTables.length > 0) {
                promises.push(...modifiedTables.map(t => tablesAPI.updateTable(t.id, {
                    x: t.x,
                    y: t.y,
                    name: t.name,
                    capacity: t.capacity,
                    shape: t.shape,
                    width: t.width,
                    height: t.height
                })));
            }

            if (promises.length === 0) {
                toast('No changes to save');
                setIsSaving(false);
                return;
            }

            await Promise.all(promises);
            await fetchData();
            toast.success('Layout saved successfully');
        } catch (error) {
            console.error('Error saving layout:', error);
            toast.error('Failed to save layout');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateTableDetails = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTable) return;

        // Show confirmation dialog
        if (!window.confirm(`Update table "${editingTable.name}" with capacity ${editingTable.capacity}?`)) {
            return;
        }

        setTables(prev => prev.map(t => t.id === editingTable.id ? editingTable : t));

        if (!editingTable.id.startsWith('temp_')) {
            setModifiedTableIds(prev => new Set(prev).add(editingTable.id));
        }

        setEditingTable(null);
        setHasUnsavedChanges(true);
        toast.success('Table updated (pending save)');
    };

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="h-[calc(100vh-10rem)] flex flex-col relative">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Table Management</h2>
                <p className="text-gray-500 dark:text-gray-400">Design your floor plan. Changes are saved only when you click "Save Layout".</p>
            </div>

            {/* Help Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 mb-4 flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">How to use:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Create <strong>Zones</strong> (e.g., Main Hall, Patio) to organize your tables.</li>
                        <li>Add tables and <strong>drag</strong> them to position.</li>
                        <li><strong>Double-click</strong> a table to edit its name and capacity.</li>
                        <li>Click <strong>Save Layout</strong> to apply all changes.</li>
                    </ul>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex flex-wrap gap-2">
                    {zones.map(zone => (
                        <div key={zone.id} className="relative group">
                            <button
                                onClick={() => setActiveZoneId(zone.id)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeZoneId === zone.id
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {zone.name}
                            </button>
                            {activeZoneId === zone.id && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteZone(zone.id); }}
                                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                    title="Delete Zone"
                                >
                                    <TrashIcon className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={handleAddZone}>
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Zone
                    </Button>
                </div>

                {activeZoneId && (
                    <div className="flex gap-2 items-center">
                        <Button size="sm" variant="secondary" onClick={() => handleAddTable('rectangle')}>
                            + Rect
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleAddTable('circle')}>
                            + Round
                        </Button>
                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2"></div>
                        <Button
                            size="sm"
                            onClick={handleSaveLayout}
                            isLoading={isSaving}
                            disabled={!hasUnsavedChanges}
                            className={hasUnsavedChanges ? 'animate-pulse' : ''}
                        >
                            Save Layout
                        </Button>
                    </div>
                )}
            </div>

            {/* Floor Plan Area */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg relative overflow-hidden shadow-inner">
                {activeZoneId ? (
                    tables.filter(t => t.zone_id === activeZoneId).map(table => (
                        <Draggable
                            key={table.id}
                            position={{ x: table.x, y: table.y }}
                            onStop={(_, data) => handleDragStop(table.id, data)}
                            bounds="parent"
                        >
                            <div
                                onDoubleClick={() => setEditingTable(table)}
                                className={`absolute flex flex-col items-center justify-center bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-600 cursor-move hover:border-orange-500 hover:shadow-lg transition-all group ${table.shape === 'circle' ? 'rounded-full' : 'rounded-md'
                                    }`}
                                style={{ width: table.width, height: table.height }}
                            >
                                <div className="font-bold text-gray-900 dark:text-white select-none pointer-events-none">{table.name}</div>
                                <div className="text-xs text-gray-500 select-none pointer-events-none">{table.capacity} ppl</div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTable(table.id);
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <TrashIcon className="h-3 w-3" />
                                </button>
                            </div>
                        </Draggable>
                    ))
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                        <ArrowPathIcon className="h-12 w-12 mb-2 opacity-20" />
                        <p>Select or create a zone to start designing your floor plan</p>
                    </div>
                )}
            </div>

            {/* Edit Table Modal */}
            {editingTable && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-80">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Table</h3>
                            <button onClick={() => setEditingTable(null)} className="text-gray-500 hover:text-gray-700">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateTableDetails} className="space-y-4">
                            <Input
                                label="Table Name"
                                value={editingTable.name}
                                onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                                autoFocus
                            />
                            <Input
                                label="Capacity (People)"
                                type="number"
                                min="1"
                                value={editingTable.capacity}
                                onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) || 0 })}
                            />
                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="button" variant="ghost" onClick={() => setEditingTable(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Update
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
