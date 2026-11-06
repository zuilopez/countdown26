# SITEMAP — countdown26 / CTD (cho Claude đọc trước khi sửa)

Repo `zuilopez/countdown26` → project Vercel `countdown` → https://ctd-luiz.vercel.app. Hiện **v0.60 · 06.11.2026**.
Nguồn dữ liệu việc: **Notion** (database D-Work); trang chỉ là giao diện đọc/ghi. Cập nhật file này khi đổi cấu trúc hoặc nâng version.

## File
| File | Vai trò |
|---|---|
| `index.html` (111 KB, ~1064 dòng) | Toàn bộ trang: CSS + HTML + JS |
| `api/dwork.js` | API Vercel: đọc/ghi database **D-Work** và **D-Work Log** trong Notion (GET, POST, PATCH, DELETE → thùng rác Notion) |
| `api/presets.js` | API Vercel: lưu preset giao diện trong database Notion **CTD Presets** |
| `api/_g.js`, `api/auth/{start,callback,me,logout}.js` | Đăng nhập Google (v0.32): OAuth code flow; refresh token mã hoá AES-GCM (khoá dẫn từ `GOOGLE_CLIENT_SECRET`) trong cookie HttpOnly `ctd_g`; `me?setup=1` tạo folder "CTD Database" + Sheets "CTD Data" trong Drive người dùng. Client ID công khai nằm trong `_g.js`. Không có database server |
| `vercel.json` | `cleanUrls: true` + header cho `sw.js` (no-cache) và `manifest.json` |
| `manifest.json`, `sw.js`, `icons/` | PWA (v0.31). `sw.js`: network-first, cache dự phòng offline; đổi `V` trong `sw.js` mỗi lần đổi danh sách shell. Icon radar sinh bằng `python3 icons/gen-icons.py` (cần rsvg-convert): `icon.svg` (tối, mặc định), `favicon-light.svg`, PNG 192/512, maskable, apple-touch. Đổi thiết kế thì sửa script rồi chạy lại. Icon đã cài trên máy là ảnh cố định, phải gỡ và cài lại mới đổi. Có 2 bộ: tối (`icon-*.png`, `manifest.json`) và sáng (`*-light.png`, `manifest-light.json`); script đầu `<head>` của `index.html` chọn bộ theo chế độ máy lúc mở ở trình duyệt và ghi nhớ (`localStorage ctd_ic`), app đã cài giữ bộ đã nhớ. **Đổi hình icon thì phải đổi `?v=` ở mọi chỗ** (manifest, `index.html`, `sw.js`), vì Chrome coi URL icon là bất biến. Hiệu ứng mở app: `#splash` ngay sau `<body>` (chỉ khi `display-mode: standalone` hoặc `?splash`) |
| `README.md` | Mô tả file + **changelog rất dài** (~11 KB). Chỉ đọc phần đầu (mô tả file), **không đọc changelog** trừ khi cần tra lịch sử |

## Bí mật và biến môi trường (chỉ nằm trong Vercel, không bao giờ ghi vào code/chat)
`GOOGLE_CLIENT_SECRET` (đăng nhập Google), `NOTION_TOKEN`, `CTD_PASSWORD` (trang gửi header `x-ctd-pass`), tuỳ chọn `DWORK_DATA_SOURCE`, `DWORK_LOG_SOURCE`, `CTD_PRESETS_SOURCE`.

## Dòng KHÔNG đọc trong `index.html`
- Dòng 13: font **DSEG7** nhúng base64 (~7 KB một dòng). Dùng `grep ... | cut -c1-200`.

## Muốn sửa X → tìm ở đâu (grep, không dùng số dòng)
| Việc | Tìm |
|---|---|
| Version / ngày | `const VERSION` |
| Giao diện mặc định ("DF" = preset mặc định) | `default look`, `const DEF` |
| Lưu cài đặt, áp cài đặt lên CSS | `applyUi`, khoá `ctd_ui_v4` |
| Đồng hồ lớn, việc gần nhất | `tick`, `fitHero`, `heroHtml`, `nextTask` |
| Gợi ý mức P1–P4 từ deadline | `function suggest` |
| Thứ tự ưu tiên / sắp xếp | `function rank`, `cmp`, `cmpO` |
| Đọc/ghi Notion từ trang | `function api`, `load(`, `patch(`, `move(` |
| Một thẻ, sửa thẻ, thêm việc | `function card`, `editCard`, `addForm` |
| Cột (board) P1–P4, Done | `function lane`, `viewBoard` |
| Timeline | `function viewTl`, `tlRange` |
| Tỉ lệ Xong tuần/tháng ở chân cột | `function ratio`, `pStart` |
| Kéo thả | `dropTarget` |
| Panel CUSTOM | `renderPanel`, `const SEC`, `setK` |
| Nút G đăng nhập Google | `id="gB"`, `Google sign-in (v0.32)` |
| Preset ↔ Notion | `syncPresets`, `prPush`, `usePreset`, `papi` |

## Tên gọi của bạn
board = mỗi cột ưu tiên (P1–P4, Done) · thẻ = một task · DF = preset mặc định · CUSTOM = panel tuỳ chỉnh bên trái · OCR = độ bo góc chung · hero = đồng hồ lớn · Timeline = bản đồ thời gian · D-Work = database Notion.

## Quy tắc khi sửa
- Notion là nguồn sự thật; không lưu việc ở nơi khác. Đổi tên cột/thuộc tính Notion thì sửa cả `api/dwork.js`.
- Một lần phát hành: tăng `VERSION` + `VDATE` trong `index.html` và thêm một dòng vào changelog của `README.md` (ngắn, một dòng).
- **Z-LAB** là site thử nghiệm riêng, không nối Notion, không phụ thuộc repo này.
- Hỏi trước khi push GitHub (quy trình 3 bước); Vercel tự deploy từ GitHub, trả link CTD sau mỗi lần cập nhật.
