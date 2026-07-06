"""
generate_pipeline_duyet.py
Pipeline ngang — Duyệt tự động hồ sơ KTX TLU
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

C_BG = "#f0f9ff"

STEPS = [
    {"label": "Duyệt\ntự động",          "color": "#1e40af", "text": "#ffffff"},
    {"label": "Chỉnh\nchỉ tiêu\n& Khoa", "color": "#3b82f6", "text": "#ffffff"},
    {"label": "Bật\ndồn\nchỉ tiêu",      "color": "#8b5cf6", "text": "#ffffff"},
    {"label": "Chạy\nthử\n(Mô phỏng)",   "color": "#64748b", "text": "#ffffff"},
    {"label": "Số liệu\nkết quả\nổn?",    "color": "#f59e0b", "text": "#1e293b"},
    {"label": "Xác nhận\nduyệt\nthực tế","color": "#16a34a", "text": "#ffffff"},
    {"label": "Tạo\nhợp đồng\nchờ gán phòng", "color": "#15803d", "text": "#ffffff"},
]

BW, BH = 1.35, 1.0   # block width / height
GAP    = 0.55         # khoảng giữa các block
n      = len(STEPS)
fig_w  = n * BW + (n - 1) * GAP + 1.2
fig_h  = 2.8

fig, ax = plt.subplots(figsize=(fig_w, fig_h))
fig.patch.set_facecolor(C_BG)
ax.set_facecolor(C_BG)
ax.set_xlim(0, fig_w)
ax.set_ylim(0, fig_h)
ax.axis("off")

# Title
ax.text(fig_w / 2, fig_h - 0.28,
        "WORKFLOW — DUYỆT TỰ ĐỘNG HỒ SƠ KTX",
        ha="center", va="center",
        fontsize=12, fontweight="bold", color="#1e40af")

cy = fig_h / 2 - 0.15   # tâm y của tất cả block

for i, step in enumerate(STEPS):
    x0 = 0.6 + i * (BW + GAP)
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
            fontsize=9.5, fontweight="bold", color=step["text"],
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

# Mũi tên quay lại từ "Kết quả ổn?" về "Chỉnh chỉ tiêu" (index 4 → index 1)
back_from = 4
back_to   = 1
x_from = 0.6 + back_from * (BW + GAP) + BW / 2
x_to   = 0.6 + back_to   * (BW + GAP) + BW / 2
y_bot  = cy - BH / 2 - 0.22

# đường gấp khúc bên dưới (vẽ thủ công 3 đoạn)
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
        "Chưa ổn — chỉnh lại",
        ha="center", va="top", fontsize=8.5,
        color="#dc2626", fontweight="bold")

# Nhánh "Tắt dồn": đường nhỏ từ block "Bật dồn" (index 2) nhảy qua "Chạy thử" (index 3)
# vẽ đường cong phía trên
skip_from = 2
skip_to   = 3
xs_from = 0.6 + skip_from * (BW + GAP) + BW / 2
xs_to   = 0.6 + skip_to   * (BW + GAP) + BW / 2
y_top   = cy + BH / 2 + 0.18

ax.plot([xs_from, xs_from], [cy + BH/2, y_top], color="#94a3b8", lw=1.3, ls="--", zorder=1)
ax.plot([xs_from, xs_to],   [y_top, y_top],      color="#94a3b8", lw=1.3, ls="--", zorder=1)
ax.annotate("",
    xy=(xs_to, cy + BH/2),
    xytext=(xs_to, y_top),
    arrowprops=dict(arrowstyle="-|>", color="#94a3b8",
                    lw=1.3, mutation_scale=11),
    zorder=1
)
ax.text((xs_from + xs_to) / 2, y_top + 0.06,
        "Nếu tắt dồn — bỏ qua",
        ha="center", va="bottom", fontsize=8.5,
        color="#1e293b", fontweight="bold")

fig.tight_layout(pad=0.2)
out = "./pipeline_duyet_tu_dong.png"
fig.savefig(out, dpi=150, bbox_inches="tight", facecolor=C_BG)
plt.close(fig)
print(f"✔  Saved: {out}")
