import Dexie, { type EntityTable } from 'dexie';

export interface Point {
    id: number;
    name: string;
    x: number;
    y: number;
    z: number;
    lat?: number;
    lon?: number;
    note: string;
}

export interface LevelingRow {
    id: string; // uuid
    no: string; // Station No.
    bs?: number; // Backsight
    fs?: number; // Foresight
    ih?: number; // Instrument Height (Calc)
    gh?: number; // Ground Height (Calc or Input)
    dist?: number; // Distance
    note: string;
    isManualGH?: boolean; // If true, GH is fixed (start point)
}

export interface LevelingSession {
    id?: number;
    date: string;
    name: string;
    note: string;
    rows: LevelingRow[];
    updatedAt: number;
}

const db = new Dexie('SurveyDatabase') as Dexie & {
    points: EntityTable<Point, 'id'>;
    levelings: EntityTable<LevelingSession, 'id'>;
};

db.version(1).stores({
    points: '++id, name, x, y, z, note'
});

db.version(2).stores({
    points: '++id, name, x, y, z, lat, lon, note'
});

db.version(3).stores({
    levelings: '++id, date, name, updatedAt'
});

export { db };
