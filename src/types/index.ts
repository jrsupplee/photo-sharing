export interface Event {
  id: number;
  slug: string;
  name: string;
  date_start: string | null;
  date_end: string | null;
  created_at: string;
}

export interface Album {
  id: number;
  event_id: number;
  name: string;
  order: number;
}

export interface Media {
  id: number;
  event_id: number;
  album_id: number | null;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  caption: string | null;
  uploader_name: string | null;
  storage_key: string;
  thumbnail_key: string | null;
  medium_key: string | null;
  created_at: string;
  // joined fields
  album_name?: string;
  like_count?: number;
  comment_count?: number;
}

export interface Comment {
  id: number;
  media_id: number;
  author_name: string;
  body: string;
  created_at: string;
}

export interface Like {
  id: number;
  media_id: number;
  session_id: string;
}
