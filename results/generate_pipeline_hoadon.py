"""
generate_pipeline_hoadon.py
Pipeline ngang — Quy trình quản lý Hóa đơn KTX TLU (Cập nhật chuẩn theo Codebase)
"""
import sys
# Configure UTF-8 encoding for standard output on Windows
if sys.platform.startswith('win'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

C_BG = "#f8fafc" # Slate-50 background for premium look

STEPS = [
    {"label": "1. Khởi tạo\nhóa đơn đầu kỳ\n(Tự động)", "color": "#1e40af", "text": "#ffffff"},
    {"label": "2. Sinh viên gửi\nsố điện, nước cuối kỳ\n(Hoặc tự điền ngày 6)", "color": "#3b82f6", "text": "#ffffff"},
    {"label": "3. Hệ thống\ntự động tính tiền\n(Điện, nước, phòng...)", "color": "#8b5cf6", "text": "#ffffff"},
    {"label": "4. Kế toán kiểm tra,\nchỉnh sửa & duyệt\n(Có xem cảnh báo)", "color": "#f59e0b", "text": "#1e293b"},
    {"label": "5. Sinh viên\nthanh toán hóa đơn\n(Cổng VNPay/Tiền mặt)", "color": "#16a34a", "text": "#ffffff"},
]

BW, BH = 1.95, 1.15   # block width / height (slightly wider to fit text cleanly)
GAP    = 0.50         # khoảng giữa các block
n      = len(STEPS)
fig_w  = n * BW + (n - 1) * GAP + 1.8 # wider canvas
fig_h  = 3.2          # slightly taller to fit the anomaly block above

fig, ax = plt.subplots(figsize=(fig_w, fig_h))
fig.patch.set_facecolor(C_BG)
ax.set_facecolor(C_BG)
ax.set_xlim(0, fig_w)
ax.set_ylim(0, fig_h)
ax.axis("off")

# Title
ax.text(fig_w / 2, fig_h - 0.28,
        "WORKFLOW — QUY TRÌNH QUẢN LÝ HÓA ĐƠN KTX TLU",
        ha="center", va="center",
        fontsize=12, fontweight="bold", color="#1e40af")

cy = fig_h / 2 - 0.25   # tâm y của tất cả block

for i, step in enumerate(STEPS):
    x0 = 0.9 + i * (BW + GAP)
    cx = x0 + BW / 2

    # Block
    box = FancyBboxPatch(
        (x0, cy - BH / 2), BW, BH,
        boxstyle="round,pad=0.06,rounding_size=0.12",
        facecolor=step["color"], edgecolor="white",
        linewidth=1.5, zorder=2
    )
    ax.add_patch(box)

    ax.text(cx, cy, step["label"],
            ha="center", va="center",
            fontsize=8.5, fontweight="bold", color=step["text"],
            multialignment="center", zorder=3,
            linespacing=1.35)

    # Mũi tên sang block tiếp theo
    if i < n - 1:
        ax.annotate("",
            xy   =(x0 + BW + GAP, cy),
            xytext=(x0 + BW, cy),
            arrowprops=dict(arrowstyle="-|>", color="#475569",
                            lw=1.6, mutation_scale=14),
            zorder=1
        )

# Loop: Kế toán từ chối hoặc phát hiện số liệu sai -> Yêu cầu SV gửi lại/đo lại (index 3 -> index 1)
x_from = 0.9 + 3 * (BW + GAP) + BW / 2
x_to   = 0.9 + 1 * (BW + GAP) + BW / 2
y_bot  = cy - BH / 2 - 0.25

ax.plot([x_from, x_from], [cy - BH/2, y_bot], color="#dc2626", lw=1.5, zorder=1)
ax.plot([x_from, x_to],   [y_bot, y_bot],      color="#dc2626", lw=1.5, zorder=1)
ax.annotate("",
    xy=(x_to, cy - BH/2),
    xytext=(x_to, y_bot),
    arrowprops=dict(arrowstyle="-|>", color="#dc2626",
                    lw=1.5, mutation_scale=13),
    zorder=1
)
ax.text((x_from + x_to) / 2, y_bot - 0.10,
        "Số liệu sai sót — Yêu cầu sinh viên cập nhật lại",
        ha="center", va="top", fontsize=8.5,
        color="#dc2626", fontweight="bold")

# Anomaly Warning Block above Step 4 (Kế toán check)
x_alert = 0.9 + 3 * (BW + GAP)
y_alert = cy + BH / 2 + 0.16
bh_alert = 0.58

alert_box = FancyBboxPatch(
    (x_alert, y_alert), BW, bh_alert,
    boxstyle="round,pad=0.03,rounding_size=0.08",
    facecolor="#fef3c7", edgecolor="#f59e0b",
    linewidth=1.2, zorder=2
)
ax.add_patch(alert_box)

ax.text(x_alert + BW / 2, y_alert + bh_alert / 2,
        "Cảnh báo bất thường\n(Lượng điện/nước tăng/giảm\n>50% so với tháng trước\nHOẶC trung bình 3 tháng)",
        ha="center", va="center",
        fontsize=7.0, fontweight="bold", color="#b45309",
        multialignment="center", zorder=3,
        linespacing=1.25)

# Arrow from alert down to Step 4
ax.annotate("",
    xy=(x_alert + BW / 2, cy + BH / 2),
    xytext=(x_alert + BW / 2, y_alert),
    arrowprops=dict(arrowstyle="-|>", color="#f59e0b",
                    lw=1.2, ls="--", mutation_scale=10),
    zorder=1
)

fig.tight_layout(pad=0.2)
out = "pipeline_hoadon.png"
fig.savefig(out, dpi=150, bbox_inches="tight", facecolor=C_BG)
plt.close(fig)
print(f"Saved: {out}")
