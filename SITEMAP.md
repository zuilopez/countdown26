# SITEMAP — countdown26 / CTD (cho Claude đọc trước khi sửa)

Repo `zuilopez/countdown26` → project Vercel `countdown` → https://ctd-luiz.vercel.app. Hiện **v0.18 · 27.10.2026**.
Nguồn dữ liệu việc: **Notion** (database D-Work); trang chỉ là giao diện đọc/ghi. Cập nhật file này khi đổi cấu trúc hoặc nâng version.

## File
| File | Vai trò |
|---|---|
| `index.html` (111 KB, ~1064 dòng) | Toàn bộ trang: CSS + HTML + JS |
| `api/dwork.js` | API Vercel: đọc/ghi database **D-Work** và **D-Work Log** trong Notion (GET, POST, PATCH, DELETE → thùng rác Notion) |
| `api/presets.js` | API Vercel: lưu preset giao diện trong database Notion **CTD Presets** |
| `dwork-ui.js` | Panel D-Work cũ, **không còn được load** (có thể xoá khi bạn đồng ý) |
| `vercel.json` | Chỉ `cleanUrls: true` |
| `README.md` | Mô tả file + **changelog rất dài** (~11 KB). Chỉ đọc phần đầu (mô tả file), **không đọc changelog** trừ khi cần tra lịch sử |

## Bí mật và biến môi trường (chỉ nằm trong Vercel, không bao giờ ghi vào code/chat)
`NOTION_TOKEN`, `CTD_PASSWORD` (trang gửi header `x-ctd-pass`), tuỳ chọn `DWORK_DATA_SOURCE`, `DWORK_LOG_SOURCE`, `CTD_PRESETS_SOURCE`.

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
| Preset ↔ Notion | `syncPresets`, `prPush`, `usePreset`, `papi` |

## Tên gọi của bạn
board = mỗi cột ưu tiên (P1–P4, Done) · thẻ = một task · DF = preset mặc định · CUSTOM = panel tuỳ chỉnh bên trái · OCR = độ bo góc chung · hero = đồng hồ lớn · Timeline = bản đồ thời gian · D-Work = database Notion.

## Quy tắc khi sửa
- Notion là nguồn sự thật; không lưu việc ở nơi khác. Đổi tên cột/thuộc tính Notion thì sửa cả `api/dwork.js`.
- Một lần phát hành: tăng `VERSION` + `VDATE` trong `index.html` và thêm một dòng vào changelog của `README.md` (ngắn, một dòng).
- **Z-LAB** là site thử nghiệm riêng, không nối Notion, không phụ thuộc repo này.
- Hỏi trước khi push GitHub (quy trình 3 bước); Vercel tự deploy từ GitHub, trả link CTD sau mỗi lần cập nhật.
