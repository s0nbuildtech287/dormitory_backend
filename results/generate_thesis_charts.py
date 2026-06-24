import os
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

# Set up matplotlib configuration for premium academic presentation
plt.rcParams['font.sans-serif'] = 'Segoe UI'
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['axes.unicode_minus'] = False

# Premium Harmony Color Palette (Modern Pastel & Vibrant accents)
COLOR_MANUAL = '#cbd5e1'       # Slate gray (Modern gray)
COLOR_SYSTEM = '#0ea5e9'       # Vibrant sky blue
COLOR_PURPLE = '#a855f7'       # AI/OCR Purple
COLOR_CYAN = '#06b6d4'         # Payment Cyan
COLOR_GREEN = '#10b981'        # Management Green
COLOR_ORANGE = '#f97316'       # Amber/Orange
COLOR_RED = '#ef4444'          # Alert Red

# Define save paths (using results folder)
save_dir = os.path.dirname(os.path.abspath(__file__))
user_home = os.path.expanduser("~")
artifact_dir = os.path.join(user_home, ".gemini", "antigravity-ide", "brain", "855c31cf-5b3b-4f8f-aeef-3bae39b1f6b1")

os.makedirs(save_dir, exist_ok=True)
try:
    os.makedirs(artifact_dir, exist_ok=True)
    has_artifact_dir = True
except Exception:
    has_artifact_dir = False

chart1_path = os.path.join(save_dir, "truc_quan_1_so_sanh.png")
chart2_path = os.path.join(save_dir, "truc_quan_2_kiem_thu.png")
chart3_path = os.path.join(save_dir, "truc_quan_3_ai_pipeline.png")
chart5_path = os.path.join(save_dir, "truc_quan_5_workflow_lien_thong.png")

art1_path = os.path.join(artifact_dir, "truc_quan_1_so_sanh.png") if has_artifact_dir else None
art2_path = os.path.join(artifact_dir, "truc_quan_2_kiem_thu.png") if has_artifact_dir else None
art3_path = os.path.join(artifact_dir, "truc_quan_3_ai_pipeline.png") if has_artifact_dir else None
art5_path = os.path.join(artifact_dir, "truc_quan_5_workflow_lien_thong.png") if has_artifact_dir else None

# ==========================================
# CHART 1: System Optimized Processing Time (Single Bar Chart)
# ==========================================
def generate_chart_1():
    operations = [
        'Nhập liệu & đăng ký hồ sơ',
        'OCR & Xác thực minh chứng',
        'Tính điểm & xét duyệt tự động',
        'Gợi ý gán phòng thông minh',
        'Tạo hợp đồng & gửi thông báo',
        'Khai báo chỉ số điện, nước',
        'Tính toán & phát hiện bất thường',
        'Gửi & phân tích phản ánh (AI)'
    ]
    
    system_times_seconds = [60, 120, 30, 30, 60, 60, 60, 30]  # times in seconds
    
    y = np.arange(len(operations))
    height = 0.5
    
    fig, ax = plt.subplots(figsize=(10, 6.5), dpi=300)
    fig.patch.set_facecolor('#ffffff')
    ax.set_facecolor('#ffffff')
    
    # Plot horizontal bars
    rects = ax.barh(y, system_times_seconds, height, color=COLOR_SYSTEM, edgecolor='#0284c7', linewidth=0.5, zorder=3)
    
    # Add values at the end of each bar
    for rect in rects:
        width = rect.get_width()
        ax.annotate(f' {width} giây',
                    xy=(width, rect.get_y() + rect.get_height() / 2),
                    xytext=(5, 0),  # 5 points horizontal offset
                    textcoords="offset points",
                    ha='left', va='center', fontsize=9.5, fontweight='bold', color='#0369a1')
    
    # Labels and titles
    ax.set_xlabel('Thời gian xử lý trung bình hệ thống (giây)', fontsize=11, fontweight='bold', labelpad=10, color='#1e293b')
    ax.set_title('ĐO LƯỜNG THỜI GIAN ĐÁP ỨNG TRUNG BÌNH CỦA CÁC NGHIỆP VỤ\nSau khi tối ưu hóa quy trình trên hệ thống thông tin', fontsize=12.5, fontweight='bold', pad=25, color='#0f172a')
    ax.set_yticks(y)
    ax.set_yticklabels(operations, fontsize=9.5, fontweight='bold', color='#334155')
    
    # Invert y-axis to read top-to-bottom
    ax.invert_yaxis()
    
    # Adjust axes limits
    ax.set_xlim(0, 140)
    
    # Grid lines
    ax.grid(axis='x', linestyle='--', alpha=0.5, zorder=0)
    
    # Hide spines
    for spine in ['top', 'right', 'left']:
        ax.spines[spine].set_visible(False)
    ax.spines['bottom'].set_color('#cbd5e1')
    
    plt.tight_layout()
    plt.savefig(chart1_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
    if art1_path:
        plt.savefig(art1_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
    plt.close()

# ==========================================
# CHART 2: Donut Chart - Test Scenarios Pass Rate
# ==========================================
def generate_chart_2():
    labels = [
        'Q.Lý Hồ sơ & Phòng ở (9 kịch bản)',
        'Q.Lý Tài chính & Thanh toán (5 kịch bản)',
        'Tích hợp AI & OCR (4 kịch bản)',
        'Xử lý Phản ánh & Kỷ luật (6 kịch bản)',
        'Xác thực & Tiện ích Hệ thống (6 kịch bản)'
    ]
    sizes = [9, 5, 4, 6, 6]
    colors = ['#0ea5e9', '#06b6d4', '#a855f7', '#ef4444', '#f97316']
    
    fig, ax = plt.subplots(figsize=(10, 8), dpi=300)
    fig.patch.set_facecolor('#ffffff')
    
    # Donut chart
    wedges, texts, autotexts = ax.pie(
        sizes, 
        labels=labels, 
        colors=colors,
        autopct='%1.1f%%', 
        startangle=140,
        pctdistance=0.75,
        textprops={'fontsize': 10, 'fontweight': 'bold', 'color': '#1e293b'},
        wedgeprops=dict(width=0.3, edgecolor='white', linewidth=2)
    )
    
    # Customize percent labels color
    for autotext in autotexts:
        autotext.set_color('white')
        autotext.set_fontsize(11)
        autotext.set_fontweight('bold')
        
    ax.axis('equal')  
    
    # Center text
    ax.text(0, 0, '30/30 PASS\nKịch bản', ha='center', va='center', fontsize=16, fontweight='bold', color='#0f172a')
    
    plt.title('PHÂN BỔ 30 KỊCH BẢN KIỂM THỬ THÀNH CÔNG (100% PASS)\nTheo các nhóm nghiệp vụ chính của Đồ án', 
              fontsize=13.5, fontweight='bold', pad=25, color='#0f172a')
              
    plt.tight_layout()
    plt.savefig(chart2_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
    if art2_path:
        plt.savefig(art2_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
    plt.close()

# ==========================================
# DIAGRAM 3: Combined AI Integration Flowchart
# ==========================================
def generate_chart_3():
    fig, ax = plt.subplots(figsize=(16, 11.5), dpi=300)
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')
    ax.axis('off')
    
    # Outer container border
    outer_box = FancyBboxPatch(
        (0.01, 0.02), 0.98, 0.93,
        boxstyle="round,pad=0.01",
        facecolor='none', edgecolor='#cbd5e1', linestyle='--', linewidth=1.5, zorder=1
    )
    ax.add_patch(outer_box)
    
    # Main Titles (increased size and y positioning)
    ax.text(0.5, 1.01, 'SƠ ĐỒ LUỒNG DỮ LIỆU TÍCH HỢP TRÍ TUỆ NHÂN TẠO (AI DATA PIPELINE)', 
            ha='center', va='top', fontsize=14, fontweight='bold', color='#0f172a')
    ax.text(0.5, 0.98, 'Quy trình tích hợp AI tự động hóa phân tích phản ánh, tóm tắt bài viết và trợ lý ảo tư vấn 24/7', 
            ha='center', va='top', fontsize=11.5, fontweight='bold', color='#1e293b')
            
    # Headers (Swapped order: Chatbot -> Sentiment -> News)
    ax.text(0.03, 0.89, 'QUY TRÌNH TRỢ LÝ ẢO CHAT TƯ VẤN THÔNG TIN KÝ TÚC XÁ', 
            ha='left', va='top', fontsize=12, fontweight='bold', color='#2563eb')
    ax.text(0.03, 0.59, 'QUY TRÌNH PHÂN TÍCH CẢM XÚC PHẢN ÁNH CỦA SINH VIÊN', 
            ha='left', va='top', fontsize=12, fontweight='bold', color='#dc2626')
    ax.text(0.03, 0.29, 'QUY TRÌNH TỰ ĐỘNG CÀO TIN TỨC VÀ TÓM TẮT BÀI BÁO BẰNG AI', 
            ha='left', va='top', fontsize=12, fontweight='bold', color='#047857')

    # Define cards (Wider rectangular shape: w=0.21, h=0.17, with adjusted y coordinates)
    cards = [
        # --- ROW 1: CHATBOT Q&A ASSISTANCE (Top row) ---
        {
            'x': 0.03, 'y': 0.67, 'w': 0.21, 'h': 0.17,
            'step': 'Bước 1: GỬI THẮC MẮC',
            'title': 'Sinh viên đặt câu hỏi',
            'desc': 'Sinh viên nhập câu hỏi\nvề nội quy, phòng ở hoặc\ngiấy tờ chính sách tại\nkhung chat Trợ lý ảo.',
            'bg': '#eff6ff', 'border': '#dbeafe', 'text': '#1d4ed8'
        },
        {
            'x': 0.27, 'y': 0.67, 'w': 0.21, 'h': 0.17,
            'step': 'Bước 2: CHUYỂN TIẾP YÊU CẦU',
            'title': 'Truyền câu hỏi & Context',
            'desc': 'Backend nhận câu hỏi cùng\nlịch sử chat từ Client gửi lên,\nsau đó chuyển tiếp dữ liệu đến\nmô hình AI để chuẩn bị xử lý.',
            'bg': '#eff6ff', 'border': '#dbeafe', 'text': '#1d4ed8'
        },
        {
            'x': 0.51, 'y': 0.67, 'w': 0.21, 'h': 0.17,
            'step': 'Bước 3: AI XỬ LÝ NGỮ NGHĨA',
            'title': 'Tra cứu & Soạn câu trả lời',
            'desc': 'Mô hình AI đọc nội dung,\nkết hợp tài liệu quy chế KTX\ndể soạn câu trả lời đầy đủ,\nchính xác nhất.',
            'bg': '#faf5ff', 'border': '#f3e8ff', 'text': '#6b21a8'
        },
        {
            'x': 0.75, 'y': 0.67, 'w': 0.22, 'h': 0.17,
            'step': 'Bước 4: HIỂN THỊ PHẢN HỒI',
            'title': 'Phản hồi tin nhắn 24/7',
            'desc': 'Hiển thị câu trả lời trực quan\ncho sinh viên trong giao diện\nchat, hỗ trợ giải quyết\nvấn đề tức thì.',
            'bg': '#ecfdf5', 'border': '#d1fae5', 'text': '#047857'
        },
        # --- ROW 2: SENTIMENT ANALYSIS (Middle row) ---
        {
            'x': 0.03, 'y': 0.37, 'w': 0.21, 'h': 0.17,
            'step': 'Bước 1: GỬI PHẢN ÁNH',
            'title': 'Gửi ý kiến phản ánh',
            'desc': 'Sinh viên gửi yêu cầu hỗ trợ\nhoặc khiếu nại sự cố\n(hỏng hóc điện nước,\nphàn nàn...) lên Portal.',
            'bg': '#fffbeb', 'border': '#fef3c7', 'text': '#b45309'
        },
        {
            'x': 0.27, 'y': 0.37, 'w': 0.21, 'h': 0.17,
            'step': 'Bước 2: GỬI DỮ LIỆU NLP',
            'title': 'Gọi OpenAI API',
            'desc': 'Backend chuyển dữ liệu\nphản ánh sang OpenAI API\nkèm prompt yêu cầu\nphân tích cảm xúc.',
            'bg': '#f0f9ff', 'border': '#e0f2fe', 'text': '#0284c7'
        },
        {
            'x': 0.51, 'y': 0.37, 'w': 0.21, 'h': 0.17,
            'step': 'Bước 3: PHÂN LOẠI CẢM XÚC',
            'title': 'AI Phân loại & Gán nhãn',
            'desc': 'OpenAI phân tích ngữ nghĩa\ntự động phân loại mức độ:\nTiêu cực / Bức xúc / Khẩn cấp\nkèm theo điểm số.',
            'bg': '#faf5ff', 'border': '#f3e8ff', 'text': '#6b21a8'
        },
        {
            'x': 0.75, 'y': 0.37, 'w': 0.22, 'h': 0.17,
            'step': 'Bước 4: CẢNH BÁO ĐỎ',
            'title': 'Đẩy thông báo Admin',
            'desc': 'Hệ thống tự động gán độ\nưu tiên "CAO", hiển thị nhãn\ncảnh báo đỏ trên Dashboard\nđể xử lý kịp thời.',
            'bg': '#fef2f2', 'border': '#fee2e2', 'text': '#dc2626'
        },
        # --- ROW 3: AUTOMATION CRAWL & NEWS SUMMARY (Bottom row) ---
        {
            'x': 0.03, 'y': 0.07, 'w': 0.21, 'h': 0.17,
            'step': 'Bước 1: CÀO TIN TỰ ĐỘNG',
            'title': 'Crawl tin tlu.edu.vn',
            'desc': 'Hệ thống định kỳ tự động\ncào tin tức mới nhất từ website\ntrường Đại học Thủy Lợi\n(Axios + Cheerio).',
            'bg': '#f0fdf4', 'border': '#d1fae5', 'text': '#047857'
        },
        {
            'x': 0.27, 'y': 0.07, 'w': 0.21, 'h': 0.17,
            'step': 'Bước 2: LƯU CACHE TẠM',
            'title': 'Lưu In-Memory Cache',
            'desc': 'Lưu tạm dữ liệu vào bộ nhớ\nđệm (Memory Cache Map)\ntrong 15 phút để tối ưu\ntốc độ truy xuất.',
            'bg': '#f0fdf4', 'border': '#d1fae5', 'text': '#047857'
        },
        {
            'x': 0.51, 'y': 0.07, 'w': 0.21, 'h': 0.17,
            'step': 'Bước 3: YÊU CẦU TÓM TẮT',
            'title': 'Sinh viên chọn tin tức',
            'desc': 'Sinh viên xem danh sách tin\ntức và click chọn yêu cầu\ntóm tắt bằng AI ngay trên\ngiao diện Chatbot.',
            'bg': '#fdf2f8', 'border': '#fce7f3', 'text': '#db2777'
        },
        {
            'x': 0.75, 'y': 0.07, 'w': 0.22, 'h': 0.17,
            'step': 'Bước 4: HIỂN THỊ TÓM TẮT',
            'title': 'AI phản hồi & tóm tắt',
            'desc': 'OpenAI API phân tích,\ntóm tắt các ý chính và\nphản hồi ngắn gọn ngay\ntrong khung chat.',
            'bg': '#fdf2f8', 'border': '#fce7f3', 'text': '#db2777'
        }
    ]
    
    # Draw cards
    for card in cards:
        # Draw box
        box = FancyBboxPatch(
            (card['x'], card['y']), card['w'], card['h'],
            boxstyle="round,pad=0.01",
            facecolor=card['bg'], edgecolor=card['border'], linewidth=1.5, zorder=2
        )
        ax.add_patch(box)
        
        # Step badge text (increased size to 11.5)
        ax.text(
            card['x'] + card['w']/2, card['y'] + card['h'] - 0.025,
            card['step'],
            ha='center', va='top', fontsize=11.5, fontweight='bold', color=card['text'], zorder=3
        )
        
        # Title (increased size to 11.0)
        ax.text(
            card['x'] + card['w']/2, card['y'] + card['h'] - 0.06,
            card['title'],
            ha='center', va='top', fontsize=11.0, fontweight='bold', color='#000000', zorder=3
        )
        
        # Description (increased size to 10.0)
        ax.text(
            card['x'] + card['w']/2, card['y'] + 0.04,
            card['desc'],
            ha='center', va='center', fontsize=10.0, fontweight='normal', color='#000000', zorder=3
        )

    # Draw arrows (adjusted for new widths w=0.21/0.22 and h=0.17)
    arrows = [
        # Row 1 (Chatbot Q&A)
        ((0.24, 0.755), (0.27, 0.755), 'Nhập câu hỏi'),
        ((0.48, 0.755), (0.51, 0.755), 'Định tuyến'),
        ((0.72, 0.755), (0.75, 0.755), 'Phản hồi'),
        # Row 2 (Sentiment Analysis)
        ((0.24, 0.455), (0.27, 0.455), 'Gửi dữ liệu'),
        ((0.48, 0.455), (0.51, 0.455), 'Gọi API NLP'),
        ((0.72, 0.455), (0.75, 0.455), 'Trả kết quả'),
        # Row 3 (News Summary)
        ((0.24, 0.155), (0.27, 0.155), 'Lưu Cache'),
        ((0.48, 0.155), (0.51, 0.155), 'Click chọn'),
        ((0.72, 0.155), (0.75, 0.155), 'Tóm tắt tin')
    ]
    
    for start, end, label in arrows:
        arrow = FancyArrowPatch(
            start, end,
            arrowstyle="-|>,head_width=3,head_length=5",
            mutation_scale=15,
            color='#94a3b8', linewidth=1.5, zorder=1
        )
        ax.add_patch(arrow)
        
        # Label placement (increased size to 8.5)
        ax.text(
            (start[0] + end[0])/2, start[1] + 0.015,
            label,
            ha='center', va='bottom', fontsize=8.5, color='#000000', fontweight='bold', fontstyle='italic'
        )

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1.03)
    
    plt.tight_layout()
    plt.savefig(chart3_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
    if art3_path:
        plt.savefig(art3_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
    plt.close()

# ==========================================
# CHART 5: End-to-End Automation Workflow Diagram
# ==========================================
def generate_chart_5():
    fig, ax = plt.subplots(figsize=(12, 7), dpi=300)
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')
    ax.axis('off')
    
    # Outer container border
    outer_box = FancyBboxPatch(
        (0.02, 0.05), 0.96, 0.90,
        boxstyle="round,pad=0.01",
        facecolor='none', edgecolor='#cbd5e1', linestyle='--', linewidth=1.5, zorder=1
    )
    ax.add_patch(outer_box)
    
    # Main Titles
    ax.text(0.5, 0.97, 'SƠ ĐỒ QUY TRÌNH NGHIỆP VỤ LIÊN THÔNG TỰ ĐỘNG HÓA (END-TO-END WORKFLOW)', 
            ha='center', va='top', fontsize=12.5, fontweight='bold', color='#0f172a')
    ax.text(0.5, 0.93, 'Luồng kế thừa dữ liệu khép kín từ khâu nộp đơn đăng ký đến thanh toán trực tuyến', 
            ha='center', va='top', fontsize=10.5, fontweight='bold', color='#1e293b')
            
    # Define cards
    cards = [
        # Row 1 (Rightwards flow)
        {
            'x': 0.04, 'y': 0.55, 'w': 0.23, 'h': 0.28,
            'step': '[ 1 ] ĐĂNG KÝ TRỰC TUYẾN',
            'title': 'Nộp đơn & tải minh chứng',
            'desc': 'Sinh viên đăng ký trực tuyến,\ntải ảnh minh chứng chính sách\nưu tiên lên Portal sinh viên.',
            'bg': '#f0f9ff', 'border': '#e0f2fe', 'text': '#0369a1'
        },
        {
            'x': 0.385, 'y': 0.55, 'w': 0.23, 'h': 0.28,
            'step': '[ 2 ] OCR & TÍNH ĐIỂM',
            'title': 'Đối soát & xét duyệt tự động',
            'desc': 'Google Vision API quét ảnh,\nHệ thống tự động tính điểm,\ngợi ý duyệt hồ sơ.',
            'bg': '#f0f9ff', 'border': '#e0f2fe', 'text': '#0369a1'
        },
        {
            'x': 0.73, 'y': 0.55, 'w': 0.23, 'h': 0.28,
            'step': '[ 3 ] GỢI Ý GÁN PHÒNG',
            'title': 'Thuật toán xếp phòng',
            'desc': 'Hệ thống tự động gán phòng\nphù hợp theo giới tính,\nkhóa học, khoa đào tạo.',
            'bg': '#f0f9ff', 'border': '#e0f2fe', 'text': '#0369a1'
        },
        # Row 2 (Leftwards flow)
        {
            'x': 0.73, 'y': 0.12, 'w': 0.23, 'h': 0.28,
            'step': '[ 4 ] KÍCH HOẠT HỢP ĐỒNG',
            'title': 'Tạo hợp đồng & tài khoản',
            'desc': 'Tự động tạo hợp đồng ở trạng thái\nPending, kích hoạt tài khoản\nsinh viên (soạn email tự động).',
            'bg': '#ecfdf5', 'border': '#d1fae5', 'text': '#047857'
        },
        {
            'x': 0.385, 'y': 0.12, 'w': 0.23, 'h': 0.28,
            'step': '[ 5 ] LẬP HÓA ĐƠN ĐỊNH KỲ',
            'title': 'Tính hóa đơn dịch vụ',
            'desc': 'Hệ thống tự động chốt số\nđiện nước, lập hóa đơn và\ncảnh báo mức dùng bất thường.',
            'bg': '#ecfdf5', 'border': '#d1fae5', 'text': '#047857'
        },
        {
            'x': 0.04, 'y': 0.12, 'w': 0.23, 'h': 0.28,
            'step': '[ 6 ] THANH TOÁN TRỰC TUYẾN',
            'title': 'Đối soát & ACTIVE hợp đồng',
            'desc': 'Sinh viên quét mã VietQR\nhoặc qua cổng VNPay.\nHợp đồng tự chuyển ACTIVE.',
            'bg': '#fdf2f8', 'border': '#fce7f3', 'text': '#db2777'
        }
    ]
    
    # Draw cards
    for card in cards:
        # Draw box
        box = FancyBboxPatch(
            (card['x'], card['y']), card['w'], card['h'],
            boxstyle="round,pad=0.01",
            facecolor=card['bg'], edgecolor=card['border'], linewidth=1.5, zorder=2
        )
        ax.add_patch(box)
        
        # Step badge text
        ax.text(
            card['x'] + card['w']/2, card['y'] + card['h'] - 0.05,
            card['step'],
            ha='center', va='top', fontsize=10.0, fontweight='bold', color=card['text'], zorder=3
        )
        
        # Title
        ax.text(
            card['x'] + card['w']/2, card['y'] + card['h'] - 0.11,
            card['title'],
            ha='center', va='top', fontsize=9.5, fontweight='bold', color='#000000', zorder=3
        )
        
        # Description
        ax.text(
            card['x'] + card['w']/2, card['y'] + 0.08,
            card['desc'],
            ha='center', va='center', fontsize=9.5, fontweight='normal', color='#000000', zorder=3
        )

    # Draw arrows
    arrows = [
        # 1 -> 2
        ((0.27, 0.69), (0.385, 0.69), 'Liên thông'),
        # 2 -> 3
        ((0.615, 0.69), (0.73, 0.69), 'Gán phòng'),
        # 3 -> 4 (Vertical)
        ((0.845, 0.55), (0.845, 0.40), 'Kích hoạt'),
        # 4 -> 5 (Leftwards)
        ((0.73, 0.26), (0.615, 0.26), 'Định kỳ'),
        # 5 -> 6 (Leftwards)
        ((0.385, 0.26), (0.27, 0.26), 'Thu học phí')
    ]
    
    for start, end, label in arrows:
        arrow = FancyArrowPatch(
            start, end,
            arrowstyle="-|>,head_width=3,head_length=5",
            color='#94a3b8', linewidth=1.5, zorder=1,
            mutation_scale=15
        )
        ax.add_patch(arrow)
        
        # Label placement
        if start[0] == end[0]:  # vertical arrow
            ax.text(
                start[0] + 0.015, (start[1] + end[1])/2,
                label,
                ha='left', va='center', fontsize=7.5, color='#000000', fontweight='bold', fontstyle='italic'
            )
        else:  # horizontal arrow
            ax.text(
                (start[0] + end[0])/2, start[1] + 0.02,
                label,
                ha='center', va='bottom', fontsize=7.5, color='#000000', fontweight='bold', fontstyle='italic'
            )

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    
    plt.tight_layout()
    plt.savefig(chart5_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
    if art5_path:
        plt.savefig(art5_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches='tight')
    plt.close()

if __name__ == '__main__':
    print("Generating Chart 1...")
    generate_chart_1()
    print("Generating Chart 2...")
    generate_chart_2()
    print("Generating Chart 3...")
    generate_chart_3()
    print("Generating Chart 5...")
    generate_chart_5()
    print("Done generating all charts successfully!")