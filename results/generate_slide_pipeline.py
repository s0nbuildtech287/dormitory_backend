import os
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

# Set up matplotlib configuration for premium presentation
plt.rcParams['font.sans-serif'] = 'Segoe UI'
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['axes.unicode_minus'] = False

# Colors
COLOR_BG1 = '#f0f9ff' # Light Blue
COLOR_BG2 = '#ecfdf5' # Light Green
COLOR_BG3 = '#faf5ff' # Light Purple
COLOR_BG4 = '#fffbeb' # Light Amber
COLOR_BG5 = '#fdf2f8' # Light Pink

COLOR_BORDER1 = '#0ea5e9'
COLOR_BORDER2 = '#10b981'
COLOR_BORDER3 = '#a855f7'
COLOR_BORDER4 = '#f97316'
COLOR_BORDER5 = '#db2777'

COLOR_TEXT1 = '#0369a1'
COLOR_TEXT2 = '#047857'
COLOR_TEXT3 = '#6b21a8'
COLOR_TEXT4 = '#b45309'
COLOR_TEXT5 = '#db2777'

save_dir = os.path.dirname(os.path.abspath(__file__))
image_path = os.path.join(save_dir, "slide_pipeline_xetduyet_ganphong.png")

fig, ax = plt.subplots(figsize=(15, 6.0), dpi=300)
fig.patch.set_facecolor('white')
ax.set_facecolor('white')
ax.axis('off')

# 5 Steps cards with updated details and slightly wider width (0.165)
cards = [
    {
        'x': 0.02, 'y': 0.08, 'w': 0.165, 'h': 0.68,
        'step': 'BƯỚC 1',
        'title': 'Mở đợt đăng ký',
        'desc': '• Kiểm kê và dự báo giường trống\n• So khớp dự báo nhu cầu cung cầu\n• Gửi email nhắc gia hạn tự động',
        'bg': COLOR_BG1, 'border': COLOR_BORDER1, 'text': COLOR_TEXT1
    },
    {
        'x': 0.22, 'y': 0.08, 'w': 0.165, 'h': 0.68,
        'step': 'BƯỚC 2',
        'title': 'Sinh viên đăng ký',
        'desc': '• Khai báo thông tin liên quan\n• Chọn diện chính sách ưu tiên nếu có\n• Tải ảnh chụp giấy tờ minh chứng',
        'bg': COLOR_BG4, 'border': COLOR_BORDER4, 'text': COLOR_TEXT4
    },
    {
        'x': 0.42, 'y': 0.08, 'w': 0.165, 'h': 0.68,
        'step': 'BƯỚC 3',
        'title': 'Xét điểm xét tuyển từng hồ sơ,\nđối soát minh chứng và\ntự động duyệt theo chỉ tiêu',
        'desc': '• Quét OCR đối soát ảnh minh chứng\n• Chấm điểm xét duyệt theo công thức\n• Duyệt tự động theo cấu hình chỉ tiêu\n• Đề xuất gợi ý phê duyệt hồ sơ',
        'bg': COLOR_BG3, 'border': COLOR_BORDER3, 'text': COLOR_TEXT3
    },
    {
        'x': 0.62, 'y': 0.08, 'w': 0.165, 'h': 0.68,
        'step': 'BƯỚC 4',
        'title': 'Gán phòng tự động',
        'desc': '• Ràng buộc đúng giới tính, sức chứa\n• Xếp cùng khóa học và khoa đào tạo\n• Phòng dành riêng cho đối tượng',
        'bg': COLOR_BG2, 'border': COLOR_BORDER2, 'text': COLOR_TEXT2
    },
    {
        'x': 0.82, 'y': 0.08, 'w': 0.165, 'h': 0.68,
        'step': 'BƯỚC 5',
        'title': 'Thiết lập hợp đồng\ncho sinh viên',
        'desc': '• Tạo hợp đồng thuê phòng ở\n• Cấp tài khoản cho sinh viên\n• Gửi email thông báo và kích hoạt',
        'bg': COLOR_BG5, 'border': COLOR_BORDER5, 'text': COLOR_TEXT5
    }
]

# Draw cards
for card in cards:
    # Draw box
    box = FancyBboxPatch(
        (card['x'], card['y']), card['w'], card['h'],
        boxstyle="round,pad=0.01",
        facecolor=card['bg'], edgecolor=card['border'], linewidth=2.0, zorder=2
    )
    ax.add_patch(box)
    
    # Step title (Larger Font Size)
    ax.text(
        card['x'] + card['w']/2, card['y'] + card['h'] - 0.07,
        card['step'],
        ha='center', va='top', fontsize=14.0, fontweight='bold', color=card['text'], zorder=3
    )
    
    # Title (Larger Font Size)
    ax.text(
        card['x'] + card['w']/2, card['y'] + card['h'] - 0.18,
        card['title'],
        ha='center', va='top', fontsize=12.5, fontweight='bold', color='#0f172a', linespacing=1.3, zorder=3
    )
    
    # Description (Larger Font Size, clean bullets)
    ax.text(
        card['x'] + card['w']/2, card['y'] + 0.24,
        card['desc'],
        ha='center', va='center', fontsize=10.0, fontweight='bold', color='#1e293b', linespacing=1.45, zorder=3
    )

# Draw solid black arrows (with zorder=4 to stay ON TOP of the cards' background)
arrows = [
    ((0.185, 0.42), (0.22, 0.42)),
    ((0.385, 0.42), (0.42, 0.42)),
    ((0.585, 0.42), (0.62, 0.42)),
    ((0.785, 0.42), (0.82, 0.42))
]

for start, end in arrows:
    arrow = FancyArrowPatch(
        start, end,
        arrowstyle="-|>",
        color='#000000', linewidth=2.5, zorder=4,
        mutation_scale=22
    )
    ax.add_patch(arrow)

# Main Title (Larger Font Size and removed "khép kín")
ax.text(0.5, 0.95, 'LUỒNG QUY TRÌNH XÉT DUYỆT HỒ SƠ VÀ GÁN PHÒNG TỰ ĐỘNG', 
        ha='center', va='top', fontsize=16.0, fontweight='bold', color='#0f172a')
ax.text(0.5, 0.88, 'Quy trình liên thông tự động từ khâu mở đợt đến khi kích hoạt hợp đồng bàn giao phòng', 
        ha='center', va='top', fontsize=11.5, color='#475569')

ax.set_xlim(0, 1)
ax.set_ylim(0, 1)

plt.tight_layout()
plt.savefig(image_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
plt.close()
print("Slide pipeline chart updated successfully with larger text and visible black arrows!")
