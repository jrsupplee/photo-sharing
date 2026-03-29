import { redirect } from 'next/navigation';
import { eventTable, qrScanTable } from '@/lib/tables';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  const event = await eventTable.findBySlug(slug);
  if (event) {
    await qrScanTable.record(event.id);
  }
  redirect(`/${slug}`);
}
