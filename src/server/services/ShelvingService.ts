import { db, initPromise } from '../db';
import { libraries, buildings, floors, sections, rooms, racks, shelves } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface ShelfLocationPath {
  shelfId: string;
  shelfCode: string;
  rackCode: string;
  roomNumber: string;
  sectionName: string;
  floorNumber: number;
  buildingName: string;
  libraryName: string;
  formattedLocation: string; // e.g., "Central Library > Floor 2 > CS Section > Rack C > Shelf 04"
}

export class ShelvingService {
  static async getShelfLocation(shelfId: string): Promise<ShelfLocationPath | null> {
    await initPromise;
    const rows = await db
      .select({
        shelfId: shelves.id,
        shelfCode: shelves.code,
        rackCode: racks.code,
        roomNumber: rooms.roomNumber,
        sectionName: sections.name,
        floorNumber: floors.floorNumber,
        buildingName: buildings.name,
        libraryName: libraries.name,
      })
      .from(shelves)
      .innerJoin(racks, eq(shelves.rackId, racks.id))
      .innerJoin(rooms, eq(racks.roomId, rooms.id))
      .innerJoin(sections, eq(rooms.sectionId, sections.id))
      .innerJoin(floors, eq(sections.floorId, floors.id))
      .innerJoin(buildings, eq(floors.buildingId, buildings.id))
      .innerJoin(libraries, eq(buildings.libraryId, libraries.id))
      .where(eq(shelves.id, shelfId))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];

    return {
      shelfId: r.shelfId,
      shelfCode: r.shelfCode,
      rackCode: r.rackCode,
      roomNumber: r.roomNumber,
      sectionName: r.sectionName,
      floorNumber: r.floorNumber,
      buildingName: r.buildingName,
      libraryName: r.libraryName,
      formattedLocation: `${r.libraryName} → Floor ${r.floorNumber} (${r.sectionName}) → ${r.rackCode} → ${r.shelfCode}`,
    };
  }

  static async getAllShelves(): Promise<Array<{ id: string; formattedLocation: string; capacity: number }>> {
    await initPromise;
    const rows = await db
      .select({
        id: shelves.id,
        capacity: shelves.capacity,
        shelfCode: shelves.code,
        rackCode: racks.code,
        sectionName: sections.name,
        floorNumber: floors.floorNumber,
        libraryName: libraries.name,
      })
      .from(shelves)
      .innerJoin(racks, eq(shelves.rackId, racks.id))
      .innerJoin(rooms, eq(racks.roomId, rooms.id))
      .innerJoin(sections, eq(rooms.sectionId, sections.id))
      .innerJoin(floors, eq(sections.floorId, floors.id))
      .innerJoin(buildings, eq(floors.buildingId, buildings.id))
      .innerJoin(libraries, eq(buildings.libraryId, libraries.id));

    return rows.map((r) => ({
      id: r.id,
      capacity: r.capacity,
      formattedLocation: `${r.libraryName} | Fl.${r.floorNumber} ${r.sectionName} | ${r.rackCode} - ${r.shelfCode}`,
    }));
  }
}
