import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# Cấu hình font hệ thống hỗ trợ tiếng Việt (Arial trên Windows rất phổ biến)
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.sans-serif'] = ['Arial', 'Calibri', 'Tahoma', 'DejaVu Sans']

# Thư mục lưu kết quả
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def create_table_image(title, headers, data, filename, col_widths=None, figsize=(10, 6), star_col_idx=None, row_height_override=None, fontsize=11):
    """
    Tạo ảnh bảng biểu chuyên nghiệp từ dữ liệu cho trước.
    Sử dụng bbox để định vị bảng với lề phải rộng rãi chống tràn chữ.
    Hỗ trợ row_height_override và custom fontsize để ngăn chữ bị đè theo chiều dọc.
    """
    fig, ax = plt.subplots(figsize=figsize, dpi=300)
    ax.axis('off')
    
    # Tính toán số lượng dòng (bao gồm header)
    num_rows = len(data) + 1
    
    # Xác định chiều cao của các hàng
    if row_height_override is not None:
        row_height = row_height_override
    else:
        if num_rows <= 5:
            row_height = 0.14
        else:
            row_height = 0.075
        
    table_height = num_rows * row_height
    if table_height > 0.8:
        table_height = 0.8
        
    bottom = 0.88 - table_height
    # Đặt lề trái = 0.05, chiều rộng = 0.88 để chừa lề phải 7% làm vùng đệm an toàn tuyệt đối chống tràn chữ
    bbox = [0.05, bottom, 0.88, table_height]
    
    # Tạo bảng sử dụng bbox định vị trực tiếp
    table = ax.table(
        cellText=data,
        colLabels=headers,
        colWidths=col_widths,
        bbox=bbox,
        cellLoc='center'
    )
    
    # Thiết lập style cho bảng
    table.auto_set_font_size(False)
    table.set_fontsize(fontsize)
    
    # Màu sắc chủ đạo (Blue & Slate) phù hợp với UI frontend
    header_bg = '#1e40af'       # Xanh dương đậm (blue-800)
    header_fg = '#ffffff'       # Chữ trắng
    row_even_bg = '#f8fafc'     # Xám nhạt (slate-50)
    row_odd_bg = '#ffffff'      # Trắng
    border_color = '#e2e8f0'    # Slate-200
    star_color = '#ea580c'      # Màu cam đậm cho ngôi sao ưu tiên (orange-600)
    
    # Duyệt qua các ô để định dạng màu sắc, font chữ và viền
    for key, cell in table.get_celld().items():
        row, col = key
        cell.set_edgecolor(border_color)
        cell.set_linewidth(1.0)
        
        if row == 0:
            # Định dạng dòng Header
            cell.set_text_props(weight='bold', color=header_fg, size=fontsize + 0.5)
            cell.set_facecolor(header_bg)
        else:
            # Định dạng dòng dữ liệu
            cell.set_text_props(color='#1e293b', size=fontsize - 0.5) # Chữ màu slate-800
            
            # Màu nền xen kẽ các dòng
            if row % 2 == 0:
                cell.set_facecolor(row_even_bg)
            else:
                cell.set_facecolor(row_odd_bg)
                
            # Định dạng cột đặc biệt
            if col == 0:
                cell.set_text_props(weight='bold')
                
            # Tô màu cam nổi bật cho cột chứa ngôi sao ưu tiên
            if star_col_idx is not None and col == star_col_idx:
                cell.set_text_props(color=star_color, weight='bold', size=fontsize + 1.0)
                
            # Định dạng cột biến số (tô màu xanh dương đậm để thể hiện rõ biến số hệ thống)
            is_variable = False
            if filename == "table_group_weights.png" and col in [1, 2, 3]:
                is_variable = True
            elif filename in ["table_policy_scores.png", "table_year_scores.png", "table_gpa_rules.png"] and col == 2:
                is_variable = True
                
            if is_variable:
                cell.set_text_props(weight='bold', color='#1d4ed8')
                
            # Căn trái cho cột giải thích của bảng 4 để dễ đọc các câu dài
            if filename == "table_gpa_rules.png" and col == 3:
                cell.set_text_props(ha='left')
                
    # Thêm tiêu đề bảng ngay sát mép trên của bảng (y = 0.92, bảng bắt đầu ở y = 0.88)
    plt.title(title, fontsize=14, weight='bold', y=0.92, color='#0f172a')
    
    # Lưu file ảnh
    output_path = os.path.join(OUTPUT_DIR, filename)
    plt.savefig(output_path, bbox_inches='tight', dpi=300)
    plt.close()
    print(f"Saved table: {output_path}")

def generate_formula_infographic():
    """
    Sinh ảnh infographic công thức tính điểm xét duyệt tự động (Tối giản, không có phần notes).
    """
    fig, ax = plt.subplots(figsize=(11.5, 3.8), dpi=300)
    ax.axis('off')
    
    # Tiêu đề chính
    plt.text(0.5, 0.88, "CÔNG THỨC TÍNH ĐIỂM XẾP HẠNG HỒ SƠ XÉT TUYỂN", 
             fontsize=15, weight='bold', ha='center', color='#1e3a8a')
    
    # 1. Vẽ khung Công thức chính (Blue box)
    rect_formula = patches.FancyBboxPatch(
        (0.05, 0.15), 0.90, 0.58, boxstyle="round,pad=0.01",
        facecolor='#eff6ff', edgecolor='#2563eb', linewidth=2
    )
    ax.add_patch(rect_formula)
    
    # Viết công thức
    plt.text(0.5, 0.52, r"Score = (P $\times$ wPrior) + (Y $\times$ wYear) + (G $\times$ wGPA)", 
             fontsize=17, weight='bold', ha='center', color='#1e40af')
    
    # Giải thích biến số trong khung công thức
    desc_text = (
        "Trong đó:\n"
        "• P: Điểm chính sách ưu tiên  |  • Y: Điểm năm học của sinh viên  |  • G: Điểm học tập quy đổi (từ GPA)\n"
        "• wPrior, wYear, wGPA: Trọng số tương ứng của Nhóm xét tuyển (wPrior + wYear + wGPA = 1.0)"
    )
    plt.text(0.5, 0.28, desc_text, fontsize=9.5, ha='center', color='#1e293b', linespacing=1.6)
    
    # Lưu file ảnh công thức
    output_path = os.path.join(OUTPUT_DIR, "table_scoring_formula.png")
    plt.savefig(output_path, bbox_inches='tight', dpi=300)
    plt.close()
    print(f"Saved formula infographic: {output_path}")

def generate_all_tables():
    # ----------------------------------------------------
    # BẢNG 1: Điểm quy đổi diện đối tượng chính sách ưu tiên (Chỉ dùng biến số thuần túy)
    # ----------------------------------------------------
    title1 = "Bảng: Điểm Quy Đổi Diện Đối Tượng Chính Sách Ưu Tiên\n(Cấu hình tham số hóa linh hoạt)"
    headers1 = ["STT", "Đối tượng ưu tiên", "Biến điểm cộng", "Mức độ ưu tiên"]
    data1 = [
        ["1", "Con liệt sỹ", "P1", "★★★★★"],
        ["2", "Con thương binh", "P2", "★★★★★"],
        ["3", "Hộ nghèo", "P3", "★★★★"],
        ["4", "Sinh viên quốc tế", "P4", "★★★★"],
        ["5", "Cận nghèo", "P5", "★★★★"],
        ["6", "Khuyết tật", "P6", "★★★"],
        ["7", "Hoàn cảnh khó khăn", "P7", "★★★"],
        ["8", "Hải đảo", "P8", "★★"],
        ["9", "Vùng sâu vùng xa", "P9", "★★"],
        ["10", "Có giấy xác nhận chính sách khác", "P10", "★"]
    ]
    create_table_image(
        title1, headers1, data1, "table_policy_scores.png",
        col_widths=[0.08, 0.47, 0.20, 0.25], figsize=(10, 6.5), star_col_idx=3
    )

    # ----------------------------------------------------
    # BẢNG 2: Điểm quy đổi theo năm học của sinh viên (Chỉ dùng biến số thuần túy)
    # ----------------------------------------------------
    title2 = "Bảng: Điểm Quy Đổi Theo Năm Học Của Sinh Viên"
    headers2 = ["STT", "Năm học của sinh viên", "Biến điểm quy đổi", "Mức độ ưu tiên"]
    data2 = [
        ["1", "Năm thứ nhất (Tân sinh viên)", "Y1", "★★★★★"],
        ["2", "Năm thứ hai", "Y2", "★★★"],
        ["3", "Năm thứ ba", "Y3", "★★"],
        ["4", "Năm thứ tư", "Y4", "★"]
    ]
    create_table_image(
        title2, headers2, data2, "table_year_scores.png",
        col_widths=[0.08, 0.47, 0.20, 0.25], figsize=(10, 4.0), star_col_idx=3
    )

    # ----------------------------------------------------
    # BẢNG 3: Trọng số (Tỷ lệ phần trăm ưu tiên) cố định áp dụng theo nhóm
    # ----------------------------------------------------
    title3 = "Bảng: Trọng Số (Tỷ Lệ % Ưu Tiên) Áp Dụng Theo Nhóm"
    headers3 = ["Nhóm đối tượng xét tuyển", "Trọng số\nChính sách", "Trọng số\nNăm học", "Trọng số\nHọc tập (GPA)"]
    data3 = [
        ["Nhóm 1 (Diện chính sách)", "wPrior1 || 0.6", "wYear1 || 0.2", "wGPA1 || 0.2"],
        ["Nhóm 2 (Tân sinh viên)", "wPrior2 || 0", "wYear2 || 0.7", "wGPA2 || 0.3"],
        ["Nhóm 3 (Sinh viên khóa cũ)", "wPrior3 || 0", "wYear3 || 0.3", "wGPA3 || 0.7"]
    ]
    create_table_image(
        title3, headers3, data3, "table_group_weights.png",
        col_widths=[0.34, 0.22, 0.22, 0.22], figsize=(11.5, 4.0), row_height_override=0.18, fontsize=10.5
    )

    # ----------------------------------------------------
    # BẢNG 4: Quy tắc tính điểm học tập (GPA) (Chỉ dùng biến số thuần túy)
    # ----------------------------------------------------
    title4 = "Bảng: Quy Tắc Tính Điểm Học Tập (GPA) & Điều Kiện Xét Tuyển"
    headers4 = ["STT", "Tiêu chí học tập", "Biến số &\nCông thức", "Quy tắc áp dụng\n& Giá trị mẫu"]
    data4 = [
        ["1", "Sinh viên khóa cũ\n(Năm 2, 3, 4)", "G = GPA * 25", "Quy đổi GPA hệ 4 sang thang 100\n(Nhân trực tiếp với hệ số 25)"],
        ["2", "Điểm sàn GPA\nxét tuyển", "GPA >= GPAmin", "GPA tối thiểu là 2.0\n(Nếu GPA < GPAmin thì\ntự động loại SV khóa cũ)"],
        ["3", "Tân sinh viên\n(Năm thứ nhất)", "GPAnew", "Gán điểm học tập mặc định\nkhi chưa có điểm GPA\n(GPAnew mặc định = 50)"]
    ]
    create_table_image(
        title4, headers4, data4, "table_gpa_rules.png",
        col_widths=[0.08, 0.32, 0.23, 0.37], figsize=(11.8, 5.0), row_height_override=0.18, fontsize=10
    )

    # ----------------------------------------------------
    # BẢNG 5: Sinh hình ảnh công thức xét tuyển tổng hợp (Infographic)
    # ----------------------------------------------------
    generate_formula_infographic()

if __name__ == "__main__":
    print("Starting generating scoring tables...")
    generate_all_tables()
    print("Done!")
