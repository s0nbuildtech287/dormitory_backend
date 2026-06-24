import os
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyBboxPatch, Rectangle

# Set up matplotlib configuration for premium graphic presentation
plt.rcParams['font.sans-serif'] = 'Segoe UI'
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['axes.unicode_minus'] = False

# Colors
COLOR_BORDER = '#cbd5e1'       # Slate 300
COLOR_TEXT_MAIN = '#1e293b'     # Slate 800
COLOR_TEXT_MUTED = '#64748b'    # Slate 500

# Directory paths
backend_results_dir = os.path.dirname(os.path.abspath(__file__))
frontend_diagrams_dir = os.path.abspath(os.path.join(backend_results_dir, "..", "..", "dormitory-frontend", "diagrams"))
nhomphananh_dir = os.path.join(frontend_diagrams_dir, "nhomphananh")
specs_nhomphananh_dir = os.path.join(frontend_diagrams_dir, "specs", "nhomphananh")

# Make directories if they don't exist
os.makedirs(nhomphananh_dir, exist_ok=True)
os.makedirs(specs_nhomphananh_dir, exist_ok=True)

# Save paths
paths_to_save = [
    os.path.join(backend_results_dir, "chuc_nang_phu_tro.png")
]

# Check and copy to brain artifact if exists
user_home = os.path.expanduser("~")
artifact_dir = os.path.join(user_home, ".gemini", "antigravity-ide", "brain", "855c31cf-5b3b-4f8f-aeef-3bae39b1f6b1")
if os.path.exists(artifact_dir):
    paths_to_save.append(os.path.join(artifact_dir, "chuc_nang_phu_tro.png"))

def draw_vector_icon(ax, name, cx, cy, size=0.016, color='#64748b'):
    """
    Draw a vector-like icon in matplotlib using simple paths and patches.
    This guarantees clean, high-resolution rendering without depending on emoji support.
    """
    if name == 'layout-grid':
        w = size * 0.4
        gap = size * 0.15
        # Top-left
        ax.add_patch(Rectangle((cx - w - gap/2, cy + gap/2), w, w, facecolor='none', edgecolor=color, linewidth=1.5))
        # Top-right
        ax.add_patch(Rectangle((cx + gap/2, cy + gap/2), w, w, facecolor='none', edgecolor=color, linewidth=1.5))
        # Bottom-left
        ax.add_patch(Rectangle((cx - w - gap/2, cy - w - gap/2), w, w, facecolor='none', edgecolor=color, linewidth=1.5))
        # Bottom-right
        ax.add_patch(Rectangle((cx + gap/2, cy - w - gap/2), w, w, facecolor='none', edgecolor=color, linewidth=1.5))
        
    elif name == 'door-closed':
        w = size * 0.55
        h = size * 0.8
        # Outer door frame
        ax.add_patch(Rectangle((cx - w/2, cy - h/2), w, h, facecolor='none', edgecolor=color, linewidth=1.5))
        # Door knob
        ax.plot(cx + w/4, cy, marker='o', markersize=3, color=color)
        
    elif name == 'armchair':
        w = size * 0.8
        h = size * 0.6
        # Seat cushion
        ax.add_patch(Rectangle((cx - w*0.35, cy - h*0.2), w*0.7, h*0.5, facecolor='none', edgecolor=color, linewidth=1.5))
        # Left arm
        ax.add_patch(Rectangle((cx - w/2, cy - h*0.2), w*0.15, h*0.8, facecolor='none', edgecolor=color, linewidth=1.5))
        # Right arm
        ax.add_patch(Rectangle((cx + w/2 - w*0.15, cy - h*0.2), w*0.15, h*0.8, facecolor='none', edgecolor=color, linewidth=1.5))
        # Backrest
        ax.add_patch(Rectangle((cx - w*0.35, cy + h*0.3), w*0.7, h*0.4, facecolor='none', edgecolor=color, linewidth=1.5))
        
    elif name == 'users':
        # Left user head and shoulder
        c1x = cx - size * 0.18
        c1y = cy + size * 0.12
        r = size * 0.18
        ax.add_patch(plt.Circle((c1x, c1y), r, facecolor='none', edgecolor=color, linewidth=1.5))
        theta = np.linspace(0, np.pi, 20)
        ax.plot(c1x + size*0.35 * np.cos(theta), c1y - r - size*0.22 + size*0.18 * np.sin(theta), color=color, linewidth=1.5)
        
        # Right user head and shoulder
        c2x = cx + size * 0.18
        c2y = cy + size * 0.12
        ax.add_patch(plt.Circle((c2x, c2y), r, facecolor='none', edgecolor=color, linewidth=1.5))
        ax.plot(c2x + size*0.35 * np.cos(theta), c2y - r - size*0.22 + size*0.18 * np.sin(theta), color=color, linewidth=1.5)
        
    elif name == 'gavel':
        # Handle line
        ax.plot([cx - size*0.35, cx + size*0.15], [cy - size*0.35, cy + size*0.15], color=color, linewidth=2)
        # Hammer head
        hdx = [cx + size*0.15 - size*0.25, cx + size*0.15 + size*0.25]
        hdy = [cy + size*0.15 + size*0.25, cy + size*0.15 - size*0.25]
        ax.plot(hdx, hdy, color=color, linewidth=3.5)
        # Base block
        ax.plot([cx - size*0.4, cx + size*0.2], [cy - size*0.38, cy - size*0.38], color=color, linewidth=1.5)
        
    elif name == 'bell':
        # Bell cup
        theta = np.linspace(0, np.pi, 25)
        ax.plot(cx + size*0.35 * np.cos(theta), cy - size*0.15 + size*0.35 * np.sin(theta), color=color, linewidth=1.5)
        # Bottom rim
        ax.plot([cx - size*0.42, cx + size*0.42], [cy - size*0.15, cy - size*0.15], color=color, linewidth=1.5)
        # Clapper
        ax.add_patch(plt.Circle((cx, cy - size*0.3), size*0.1, facecolor=color))
        
    elif name == 'file-text':
        w = size * 0.55
        h = size * 0.8
        # Document border
        ax.add_patch(Rectangle((cx - w/2, cy - h/2), w, h, facecolor='none', edgecolor=color, linewidth=1.5))
        # Text lines
        ax.plot([cx - w*0.3, cx + w*0.3], [cy + h*0.2, cy + h*0.2], color=color, linewidth=1)
        ax.plot([cx - w*0.3, cx + w*0.3], [cy, cy], color=color, linewidth=1)
        ax.plot([cx - w*0.3, cx + w*0.0], [cy - h*0.2, cy - h*0.2], color=color, linewidth=1)
        
    elif name == 'credit-card':
        w = size * 0.75
        h = size * 0.52
        # Card border
        ax.add_patch(Rectangle((cx - w/2, cy - h/2), w, h, facecolor='none', edgecolor=color, linewidth=1.5))
        # Magnetic strip
        ax.fill_between([cx - w/2, cx + w/2], cy + h*0.1, cy + h*0.25, color=color, zorder=3)
        # Chip
        ax.add_patch(Rectangle((cx - w*0.35, cy - h*0.32), w*0.2, h*0.22, facecolor='none', edgecolor=color, linewidth=1))
        
    elif name == 'star':
        # Star marker
        ax.plot(cx, cy, marker='*', markersize=10, color=color, linestyle='None')
        
    elif name == 'alert-triangle':
        # Triangle border
        tx = [cx, cx - size*0.45, cx + size*0.45, cx]
        ty = [cy + size*0.42, cy - size*0.38, cy - size*0.38, cy + size*0.42]
        ax.plot(tx, ty, color=color, linewidth=1.5)
        # Exclamation point
        ax.text(cx, cy - size*0.08, '!', ha='center', va='center', fontsize=9, fontweight='bold', color=color)
        
    elif name == 'message-square':
        w = size * 0.7
        h = size * 0.52
        # Speech bubble rect
        ax.add_patch(Rectangle((cx - w/2, cy - h*0.35), w, h, facecolor='none', edgecolor=color, linewidth=1.5))
        # Speech tail
        tx = [cx - w*0.3, cx - w*0.3, cx - w*0.08]
        ty = [cy - h*0.35, cy - h*0.7, cy - h*0.35]
        ax.plot(tx, ty, color=color, linewidth=1.5)
        
    elif name == 'mail':
        w = size * 0.72
        h = size * 0.48
        # Envelope box
        ax.add_patch(Rectangle((cx - w/2, cy - h/2), w, h, facecolor='none', edgecolor=color, linewidth=1.5))
        # Diagonal envelope fold lines
        ax.plot([cx - w/2, cx, cx + w/2], [cy + h/2, cy - h*0.1, cy + h/2], color=color, linewidth=1.5)
        
    elif name == 'clipboard-list':
        w = size * 0.55
        h = size * 0.78
        # Clipboard border
        ax.add_patch(Rectangle((cx - w/2, cy - h/2), w, h, facecolor='none', edgecolor=color, linewidth=1.5))
        # Top clip
        ax.add_patch(Rectangle((cx - w*0.25, cy + h/2 - size*0.08), w*0.5, size*0.16, facecolor='none', edgecolor=color, linewidth=1.5))
        # Internal list lines
        ax.plot([cx - w*0.15, cx + w*0.25], [cy + h*0.15, cy + h*0.15], color=color, linewidth=1)
        ax.plot([cx - w*0.15, cx + w*0.25], [cy - h*0.15, cy - h*0.15], color=color, linewidth=1)
        # Bullet dots
        ax.plot(cx - w*0.3, cy + h*0.15, marker='o', markersize=2.5, color=color)
        ax.plot(cx - w*0.3, cy - h*0.15, marker='o', markersize=2.5, color=color)
        
    elif name == 'building-header':
        w = size * 0.65
        h = size * 0.8
        # Roof triangle
        rx = [cx - w/2, cx, cx + w/2]
        ry = [cy + h*0.08, cy + h*0.45, cy + h*0.08]
        ax.plot(rx, ry, color=color, linewidth=1.8)
        # Main base
        ax.add_patch(Rectangle((cx - w/2, cy - h/2), w, h*0.58, facecolor='none', edgecolor=color, linewidth=1.8))
        # Door
        ax.add_patch(Rectangle((cx - w*0.15, cy - h/2), w*0.3, h*0.28, facecolor='none', edgecolor=color, linewidth=1.5))
        
    elif name == 'user-header':
        # Head
        ax.add_patch(plt.Circle((cx, cy + size*0.18), size*0.2, facecolor='none', edgecolor=color, linewidth=1.8))
        # Shoulders (arc)
        theta = np.linspace(0, np.pi, 20)
        bx = cx + size*0.42 * np.cos(theta)
        by = cy - size*0.4 + size*0.32 * np.sin(theta)
        ax.plot(bx, by, color=color, linewidth=1.8)
        
    elif name == 'database-header':
        w = size * 0.6
        h = size * 0.8
        # Stacked database slots
        # Top cylinder block
        ax.add_patch(Rectangle((cx - w/2, cy + h*0.12), w, h*0.3, facecolor='none', edgecolor=color, linewidth=1.8))
        # Bottom cylinder block
        ax.add_patch(Rectangle((cx - w/2, cy - h*0.42), w, h*0.3, facecolor='none', edgecolor=color, linewidth=1.8))
        # Horizontal lines (slot dividers)
        ax.plot([cx - w*0.2, cx + w*0.3], [cy + h*0.27, cy + h*0.27], color=color, linewidth=1.2)
        ax.plot([cx - w*0.2, cx + w*0.3], [cy - h*0.27, cy - h*0.27], color=color, linewidth=1.2)
        # LED indicators
        ax.plot(cx - w*0.35, cy + h*0.27, marker='o', markersize=3, color=color)
        ax.plot(cx - w*0.35, cy - h*0.27, marker='o', markersize=3, color=color)

def generate_graphic():
    fig, ax = plt.subplots(figsize=(10.5, 6.5), dpi=300)
    fig.patch.set_facecolor('#ffffff')
    ax.set_facecolor('#ffffff')
    ax.axis('off')
    
    # Define columns data
    columns = [
        {
            'title': 'Ban quản lý',
            'icon': 'building-header',
            'x': 0.02, 'w': 0.305,
            'header_bg': '#e6f4ea', 'header_text': '#137333',
            'items': [
                {
                    'title': 'Dashboard thống kê',
                    'desc': 'Tổng quan phòng, hóa đơn, phản ánh',
                    'icon': 'layout-grid'
                },
                {
                    'title': 'Quản lý phòng',
                    'desc': 'Trạng thái, sức chứa, loại phòng',
                    'icon': 'door-closed'
                },
                {
                    'title': 'Quản lý tài sản thiết bị',
                    'desc': 'Nhập/xuất kho, tình trạng từng phòng',
                    'icon': 'armchair'
                },
                {
                    'title': 'Phân công xung kích',
                    'desc': 'Gán tình nguyện viên trực tòa nhà',
                    'icon': 'users'
                },
                {
                    'title': 'Lập phiếu kỷ luật',
                    'desc': 'Tự động trừ điểm và phát email cảnh báo',
                    'icon': 'gavel'
                },
                {
                    'title': 'Gửi thông báo',
                    'desc': 'Realtime qua Socket.IO, theo nhóm',
                    'icon': 'bell'
                }
            ]
        },
        {
            'title': 'Sinh viên',
            'icon': 'user-header',
            'x': 0.347, 'w': 0.305,
            'header_bg': '#efeefd', 'header_text': '#4f46e5',
            'items': [
                {
                    'title': 'Xem hợp đồng',
                    'desc': 'Thông tin phòng, thời hạn, trạng thái',
                    'icon': 'file-text'
                },
                {
                    'title': 'Xem hóa đơn',
                    'desc': 'Lịch sử thanh toán, trạng thái nợ',
                    'icon': 'credit-card'
                },
                {
                    'title': 'Điểm rèn luyện',
                    'desc': 'Theo dõi điểm, lịch sử trừ điểm',
                    'icon': 'star'
                },
                {
                    'title': 'Lịch sử kỷ luật',
                    'desc': 'Xem phiếu vi phạm cá nhân',
                    'icon': 'alert-triangle'
                },
                {
                    'title': 'Gửi phản ánh',
                    'desc': 'Sửa chữa, an ninh, vệ sinh tòa nhà',
                    'icon': 'message-square'
                },
                {
                    'title': 'Nhận thông báo',
                    'desc': 'Từ ban quản lý theo thời gian thực',
                    'icon': 'bell'
                }
            ]
        },
        {
            'title': 'Hệ thống',
            'icon': 'database-header',
            'x': 0.675, 'w': 0.305,
            'header_bg': '#f5f5f4', 'header_text': '#44403c',
            'items': [
                {
                    'title': 'Xác thực OTP qua email',
                    'desc': 'Đăng ký tài khoản, đổi mật khẩu',
                    'icon': 'mail'
                },
                {
                    'title': 'Nhật ký log hệ thống',
                    'desc': 'Ghi lại toàn bộ thao tác người dùng',
                    'icon': 'clipboard-list'
                }
            ]
        }
    ]
    
    # Layout configuration
    card_y = 0.02
    card_h = 0.96
    header_h = 0.105
    header_y = card_y + card_h - header_h  # 0.875 to 0.98
    
    for col in columns:
        x = col['x']
        w = col['w']
        
        # 1. Main outer card container (with round corners)
        outer_box = FancyBboxPatch(
            (x, card_y), w, card_h,
            boxstyle="round,pad=0.015",
            facecolor='#ffffff', edgecolor='#e2e8f0', linewidth=1.5, zorder=2
        )
        ax.add_patch(outer_box)
        
        # 2. Header background with rounded top (using FancyBboxPatch for rounded corners)
        header_box = FancyBboxPatch(
            (x, header_y), w, header_h,
            boxstyle="round,pad=0.015",
            facecolor=col['header_bg'], edgecolor='none', zorder=3
        )
        ax.add_patch(header_box)
        
        # Fill in the bottom part of the header to make it flat at the bottom
        fill_box = Rectangle(
            (x - 0.01, header_y - 0.005), w + 0.02, header_h * 0.6,
            facecolor=col['header_bg'], edgecolor='none', zorder=4
        )
        ax.add_patch(fill_box)
        
        # 3. Draw a divider border line below the header
        ax.plot([x - 0.01, x + w + 0.01], [header_y, header_y], color='#e2e8f0', linewidth=1.2, zorder=5)
        
        # 4. Header Text (Centered, no icon)
        header_cy = header_y + header_h / 2
        
        ax.text(
            x + w/2, header_cy,
            col['title'],
            ha='center', va='center', fontsize=12, fontweight='bold', color=col['header_text'], zorder=6
        )
        
        # Three dots (...) on the far right of System header
        if col['title'] == 'Hệ thống':
            ax.text(x + w - 0.03, header_cy + 0.01, '...', ha='center', va='center', fontsize=16, color='#cbd5e1', zorder=6)
            
        # 5. Draw Items inside column
        items = col['items']
        # Vertical spacing details
        item_start_y = 0.81
        item_spacing = 0.125
        
        for idx, item in enumerate(items):
            item_cy = item_start_y - idx * item_spacing
            
            # Text block (Title + Description, shifted left, no icon)
            text_x = x + 0.028
            # Title
            ax.text(
                text_x, item_cy + 0.016,
                item['title'],
                ha='left', va='center', fontsize=10.5, fontweight='bold', color=COLOR_TEXT_MAIN, zorder=5
            )
            # Description (supports wrapping if long)
            desc_text = item['desc']
            # Simple wrapping for long descriptions
            if len(desc_text) > 38:
                # split at comma or space
                parts = desc_text.split(', ')
                if len(parts) == 2:
                    desc_text = parts[0] + ',\n' + parts[1]
            ax.text(
                text_x, item_cy - 0.013,
                desc_text,
                ha='left', va='center', fontsize=9.2, color=COLOR_TEXT_MUTED, linespacing=1.35, zorder=5
            )
            
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    
    plt.tight_layout()
    
    # Save image
    for save_path in paths_to_save:
        plt.savefig(save_path, dpi=300, facecolor='#ffffff', bbox_inches='tight')
        print(f"Saved graphic to: {save_path}")
        
    plt.close()

if __name__ == '__main__':
    print("Generating auxiliary features graphic...")
    generate_graphic()
    print("Done!")
