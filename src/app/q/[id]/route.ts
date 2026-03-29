import { redirect } from 'next/navigation';
import { eventTable, qrScanTable } from '@/lib/tables';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const event = await eventTable.findById(id);
  if (event) {
    await qrScanTable.record(event.id);
    redirect(`/${event.slug}`);
  }
  redirect('/');
}
