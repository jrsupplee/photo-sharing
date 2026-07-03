// Help text shown by the HelpTip icons on the admin event manage page.
// Supports basic Markdown: **bold** and *italic*.

export const helpText = {
  event_avatar:
    'Displayed at the top of the gallery.',
  event_name:
    'Name displayed at the top of the gallery.',
  event_date:
    'Date displayed at the top of the gallery.',
  close_uploads_date:
    'Uploads are closed after this date.',
  require_name:
    'When uploading an image, should a name be required?',
  albums:
    'Albums can be marked as *hidden* and/or *locked*. **Hidden** albums do not appear on the gallery page, while **locked** albums appear but cannot have images or videos added.',
  available_from:
    'If set, the album will not appear in the gallery until the specified date.',
} as const;

export type HelpKey = keyof typeof helpText;
