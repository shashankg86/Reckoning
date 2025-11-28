export interface Zone {
    id: string;
    store_id: string;
    name: string;
    created_at: string;
}

export interface Table {
    id: string;
    store_id: string;
    zone_id: string;
    name: string;
    capacity: number;
    shape: 'rectangle' | 'circle' | 'square';
    x: number;
    y: number;
    width: number;
    height: number;
    is_occupied: boolean;
    created_at: string;
}
