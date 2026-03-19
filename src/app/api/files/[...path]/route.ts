import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
  const filePath = path.join(uploadDir, ...pathSegments);

  // Security: ensure the resolved path is within the upload directory
  if (!filePath.startsWith(uploadDir)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const fileSize = stat.size;

  const rangeHeader = req.headers.get('range');

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (!match) {
      return new NextResponse('Invalid Range', { status: 416 });
    }

    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    if (start > end || end >= fileSize) {
      return new NextResponse('Range Not Satisfiable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${fileSize}` },
      });
    }

    const chunkSize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    return new NextResponse(fileStream as unknown as ReadableStream, {
      status: 206,
      headers: {
        'Content-Type': contentType,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': String(chunkSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // No range request — stream the whole file
  const fileStream = fs.createReadStream(filePath);
  return new NextResponse(fileStream as unknown as ReadableStream, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(fileSize),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
