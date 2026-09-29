import { NextResponse } from 'next/server';
import { InventoryService } from '@/server/services/InventoryService';
import { requireAuth } from '@/server/lib/auth-session';
import { PERMISSIONS } from '@/server/lib/rbac';

export async function GET() {
  try {
    await requireAuth(PERMISSIONS.INVENTORY_MANAGE);
    const csvContent = await InventoryService.exportToCsv();

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="inventory-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to export inventory' }, { status: 500 });
  }
}
