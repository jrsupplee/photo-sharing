# QR Codes

## Library

The app uses the [`qrcode`](https://www.npmjs.com/package/qrcode) npm package (v1.5.4), which generates standard **QR Code Model 2** symbols. This is the most common variant and is supported by every modern smartphone camera and QR reader.

## QR Code variants

| Variant             | Notes                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| **QR Code Model 2** | Standard; universally supported. Used by this app.                    |
| QR Code Model 1     | Older, smaller capacity, rarely encountered. No benefit over Model 2. |
| Micro QR            | Very limited data capacity; too small for a URL.                      |
| iQR / rMQR          | Newer Denso Wave formats with poor scanner support.                   |

## Error correction levels

QR codes embed redundant data so that a partially damaged or obscured code can still be decoded. There are four levels:

| Level | Recovery capacity | Code density                             |
| ----- | ----------------- | ---------------------------------------- |
| **L** | 7%                | Lowest (easiest to scan)                 |
| **M** | 15%               | Medium                                   |
| **Q** | 25%               | High                                     |
| **H** | 30%               | Highest (hardest to scan at small sizes) |

This app uses **level H** (`errorCorrectionLevel: 'H'`), which is necessary because the event avatar is composited over the centre of the code, effectively obscuring part of it.

## Avatar size and the H budget

The avatar currently covers approximately 35% of the code area by width (`NEXT_PUBLIC_QR_AVATAR_SIZE`, default `0.35`). This technically exceeds H's 30% recovery budget. It works in practice because:

- The avatar is centered, and QR data is distributed redundantly across the whole symbol.
- The three finder patterns (corner squares) remain fully visible.

However, a long URL or poor print quality could cause scan failures. To stay safely within the H budget, keep `NEXT_PUBLIC_QR_AVATAR_SIZE` at **0.25–0.28** or lower. The current default of 0.35 is a balance between visual impact and scan reliability.

## Configuration

| Variable                     | Default | Description                                                     |
| ---------------------------- | ------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_QR_CODE_SIZE`   | `512`   | PNG export size in pixels                                       |
| `NEXT_PUBLIC_QR_AVATAR_SIZE` | `0.35`  | Avatar width as a fraction of QR code width (e.g. `0.35` = 35%) |

Both variables require the `NEXT_PUBLIC_` prefix because QR code generation runs in the browser.
