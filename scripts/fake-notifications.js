/**
 * Script tạo fake data thông báo (notifications)
 * - Tạo ~100 thông báo đa dạng loại và đối tượng
 * - ID dạng: noti-xx (noti-01 đến noti-100)
 *
 * Chạy: node scripts/fake-notifications.js
 */

const pool = require('../src/config/database');

// ============================================================
// DỮ LIỆU MẪU THEO TỪNG LOẠI THÔNG BÁO
// ============================================================

const NOTIFICATIONS = [
  // --- THÔNG BÁO CHUNG ---
  {
    title: 'Thông báo lịch kiểm tra phòng định kỳ tháng 1',
    content: 'Ban quản lý ký túc xá thông báo lịch kiểm tra phòng định kỳ tháng 1/2025. Các sinh viên vui lòng dọn dẹp phòng sạch sẽ và có mặt tại phòng trong khung giờ kiểm tra từ 8h00 đến 11h00 ngày 15/01/2025.',
    type: 'Thông báo chung', audience: 'ALL', priority: 2,
  },
  {
    title: 'Thông báo nghỉ Tết Nguyên Đán 2025',
    content: 'Ký túc xá sẽ tạm ngừng nhận sinh viên mới trong thời gian nghỉ Tết từ ngày 25/01/2025 đến ngày 02/02/2025. Sinh viên ở lại cần đăng ký với ban quản lý trước ngày 20/01/2025.',
    type: 'Thông báo chung', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo nội quy sử dụng khu vực bếp chung',
    content: 'Nhằm đảm bảo vệ sinh và an toàn, ban quản lý yêu cầu tất cả sinh viên tuân thủ nội quy khu vực bếp chung: không để thức ăn qua đêm, vệ sinh sau khi sử dụng, không dùng bếp sau 22h00.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 2,
  },
  {
    title: 'Thông báo lịch tổng vệ sinh khu ký túc xá',
    content: 'Ban quản lý tổ chức tổng vệ sinh toàn khu ký túc xá vào sáng thứ Bảy ngày 18/01/2025. Tất cả sinh viên có trách nhiệm tham gia dọn dẹp khu vực phòng ở và hành lang tầng của mình.',
    type: 'Thông báo chung', audience: 'ALL', priority: 2,
  },
  {
    title: 'Thông báo thay đổi giờ đóng cổng ký túc xá',
    content: 'Kể từ ngày 01/02/2025, giờ đóng cổng ký túc xá sẽ thay đổi từ 23h00 sang 22h30. Sinh viên về muộn cần liên hệ bảo vệ và xuất trình thẻ sinh viên. Vi phạm sẽ bị ghi nhận vào hồ sơ.',
    type: 'Thông báo chung', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo đăng ký ở lại hè 2025',
    content: 'Sinh viên có nhu cầu ở lại ký túc xá trong hè 2025 vui lòng đăng ký trực tuyến trên hệ thống trước ngày 30/04/2025. Ưu tiên sinh viên thực tập và sinh viên năm cuối làm đồ án.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 2,
  },
  {
    title: 'Thông báo kết quả bình chọn phòng xuất sắc tháng 12',
    content: 'Ban quản lý xin chúc mừng phòng A-305 đã đạt danh hiệu "Phòng xuất sắc" tháng 12/2024. Phòng được thưởng miễn phí tiền rác 1 tháng và giấy khen của Ban giám đốc.',
    type: 'Thông báo chung', audience: 'ALL', priority: 1,
  },
  {
    title: 'Thông báo lịch tiêm phòng cúm miễn phí',
    content: 'Trạm y tế trường phối hợp với ký túc xá tổ chức tiêm phòng cúm miễn phí cho sinh viên vào ngày 20/01/2025 tại hội trường tầng 1 tòa A. Sinh viên mang theo thẻ sinh viên khi đến tiêm.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 2,
  },
  {
    title: 'Thông báo quy định mới về khách thăm',
    content: 'Kể từ ngày 15/01/2025, khách thăm phải đăng ký tại bảo vệ và chỉ được vào khu vực tiếp khách tầng 1. Không được phép lên phòng ở. Giờ tiếp khách: 8h00 - 20h00 các ngày trong tuần.',
    type: 'Thông báo chung', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo hội thảo kỹ năng sống cho sinh viên năm nhất',
    content: 'Ban quản lý ký túc xá phối hợp tổ chức hội thảo "Kỹ năng sống tự lập" dành cho sinh viên năm nhất vào 14h00 ngày 22/01/2025 tại hội trường tầng 1. Tham dự được cộng điểm rèn luyện.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 1,
  },

  // --- THANH TOÁN ---
  {
    title: 'Thông báo hóa đơn tháng 1/2025 đã được tạo',
    content: 'Hóa đơn tiền phòng, điện, nước tháng 1/2025 đã được tạo và gửi đến từng sinh viên. Hạn thanh toán là ngày 15/01/2025. Sinh viên vui lòng kiểm tra và thanh toán đúng hạn để tránh phát sinh phí trễ hạn.',
    type: 'Thanh toán', audience: 'STUDENTS', priority: 3,
  },
  {
    title: 'Nhắc nhở thanh toán hóa đơn sắp đến hạn',
    content: 'Hóa đơn tháng 1/2025 sẽ đến hạn vào ngày 15/01/2025. Sinh viên chưa thanh toán vui lòng hoàn tất trước hạn. Sau ngày 15/01, hệ thống sẽ tự động tính thêm phí trễ hạn 5% trên tổng hóa đơn.',
    type: 'Thanh toán', audience: 'STUDENTS', priority: 4,
  },
  {
    title: 'Thông báo tăng giá điện từ tháng 2/2025',
    content: 'Theo quyết định của Tập đoàn Điện lực Việt Nam, giá điện sẽ điều chỉnh tăng từ 3.500 VNĐ/kWh lên 3.800 VNĐ/kWh kể từ kỳ hóa đơn tháng 2/2025. Ban quản lý thông báo để sinh viên biết và tiết kiệm điện.',
    type: 'Thanh toán', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo hỗ trợ thanh toán online qua VNPay',
    content: 'Kể từ tháng 2/2025, sinh viên có thể thanh toán hóa đơn trực tuyến qua cổng VNPay ngay trên hệ thống quản lý ký túc xá. Hỗ trợ các hình thức: thẻ ATM nội địa, thẻ tín dụng, ví điện tử MoMo, ZaloPay.',
    type: 'Thanh toán', audience: 'STUDENTS', priority: 2,
  },
  {
    title: 'Thông báo miễn giảm tiền phòng cho sinh viên có hoàn cảnh khó khăn',
    content: 'Nhà trường hỗ trợ giảm 30% tiền phòng cho sinh viên có hoàn cảnh khó khăn học kỳ 2 năm học 2024-2025. Sinh viên nộp hồ sơ xét duyệt tại phòng Công tác sinh viên trước ngày 31/01/2025.',
    type: 'Thanh toán', audience: 'STUDENTS', priority: 3,
  },
  {
    title: 'Thông báo hóa đơn tháng 12/2024 quá hạn',
    content: 'Một số sinh viên chưa thanh toán hóa đơn tháng 12/2024 đã quá hạn. Phí trễ hạn 5% đã được cộng vào hóa đơn. Sinh viên vui lòng thanh toán ngay để tránh ảnh hưởng đến hợp đồng thuê phòng.',
    type: 'Thanh toán', audience: 'STUDENTS', priority: 4,
  },
  {
    title: 'Thông báo điều chỉnh phí gửi xe từ tháng 3/2025',
    content: 'Phí gửi xe máy tại ký túc xá sẽ điều chỉnh từ 50.000 VNĐ/tháng lên 60.000 VNĐ/tháng kể từ tháng 3/2025 do chi phí vận hành tăng. Phí xe đạp giữ nguyên 20.000 VNĐ/tháng.',
    type: 'Thanh toán', audience: 'ALL', priority: 2,
  },
  {
    title: 'Thông báo hoàn tiền cọc cho sinh viên tốt nghiệp',
    content: 'Sinh viên tốt nghiệp đợt tháng 12/2024 đã trả phòng đúng quy định sẽ được hoàn tiền cọc trong vòng 7 ngày làm việc. Vui lòng cung cấp số tài khoản ngân hàng tại văn phòng ban quản lý.',
    type: 'Thanh toán', audience: 'SPECIFIC', priority: 2,
  },
  {
    title: 'Thông báo hóa đơn tháng 2/2025 đã được tạo',
    content: 'Hóa đơn tháng 2/2025 đã được tạo với mức giá điện mới 3.800 VNĐ/kWh. Hạn thanh toán ngày 15/02/2025. Sinh viên đăng nhập hệ thống để xem chi tiết hóa đơn của phòng mình.',
    type: 'Thanh toán', audience: 'STUDENTS', priority: 3,
  },
  {
    title: 'Thông báo chương trình thưởng thanh toán sớm',
    content: 'Sinh viên thanh toán hóa đơn trước ngày 10 hàng tháng sẽ được giảm 2% tổng hóa đơn. Chương trình áp dụng từ tháng 2/2025. Ưu đãi tự động áp dụng khi thanh toán qua hệ thống online.',
    type: 'Thanh toán', audience: 'STUDENTS', priority: 2,
  },

  // --- BẢO TRÌ ---
  {
    title: 'Thông báo bảo trì hệ thống điện tòa A ngày 10/01/2025',
    content: 'Hệ thống điện tòa A sẽ được bảo trì từ 8h00 đến 12h00 ngày 10/01/2025. Trong thời gian này, điện sẽ bị cắt toàn bộ tòa A. Sinh viên vui lòng sạc đầy thiết bị điện tử trước thời điểm bảo trì.',
    type: 'Bảo trì', audience: 'SPECIFIC', priority: 3,
  },
  {
    title: 'Thông báo sửa chữa hệ thống nước tòa B tầng 3-5',
    content: 'Do sự cố đường ống, hệ thống nước tòa B từ tầng 3 đến tầng 5 sẽ tạm ngừng cung cấp từ 7h00 đến 17h00 ngày 12/01/2025. Ban quản lý xin lỗi vì sự bất tiện này và sẽ bố trí nước sinh hoạt tạm thời tại tầng 1.',
    type: 'Bảo trì', audience: 'SPECIFIC', priority: 4,
  },
  {
    title: 'Thông báo nâng cấp hệ thống wifi ký túc xá',
    content: 'Hệ thống wifi toàn khu ký túc xá sẽ được nâng cấp lên chuẩn WiFi 6 từ ngày 20/01 đến 25/01/2025. Trong thời gian nâng cấp, internet có thể bị gián đoạn. Sau nâng cấp, tốc độ mạng sẽ tăng gấp 3 lần.',
    type: 'Bảo trì', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo bảo trì thang máy tòa C',
    content: 'Thang máy tòa C sẽ được bảo trì định kỳ vào ngày 14/01/2025 từ 8h00 đến 16h00. Sinh viên vui lòng sử dụng cầu thang bộ trong thời gian này. Xin lỗi vì sự bất tiện.',
    type: 'Bảo trì', audience: 'SPECIFIC', priority: 2,
  },
  {
    title: 'Thông báo lắp đặt camera an ninh mới',
    content: 'Ban quản lý sẽ lắp đặt thêm 20 camera an ninh tại các khu vực hành lang và cầu thang từ ngày 16/01 đến 18/01/2025. Đây là biện pháp tăng cường an ninh cho toàn khu ký túc xá.',
    type: 'Bảo trì', audience: 'ALL', priority: 2,
  },
  {
    title: 'Thông báo sơn lại hành lang tòa D',
    content: 'Hành lang tòa D sẽ được sơn lại từ ngày 22/01 đến 24/01/2025. Sinh viên lưu ý không chạm vào tường trong thời gian thi công. Mùi sơn có thể ảnh hưởng đến một số sinh viên nhạy cảm.',
    type: 'Bảo trì', audience: 'SPECIFIC', priority: 1,
  },
  {
    title: 'Thông báo kiểm tra và thay thế bóng đèn hành lang',
    content: 'Đội kỹ thuật sẽ tiến hành kiểm tra và thay thế toàn bộ bóng đèn hành lang bị hỏng vào ngày 17/01/2025. Sinh viên phát hiện bóng đèn hỏng trong phòng vui lòng báo cáo qua hệ thống phản hồi.',
    type: 'Bảo trì', audience: 'ALL', priority: 1,
  },
  {
    title: 'Thông báo bảo trì hệ thống phòng cháy chữa cháy',
    content: 'Hệ thống báo cháy và chữa cháy tự động sẽ được kiểm tra định kỳ vào ngày 19/01/2025. Trong quá trình kiểm tra, còi báo cháy có thể kêu thử. Sinh viên không cần sơ tán khi nghe tiếng còi thử.',
    type: 'Bảo trì', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo sửa chữa nhà vệ sinh chung tầng 2 tòa A',
    content: 'Nhà vệ sinh chung tầng 2 tòa A sẽ đóng cửa để sửa chữa từ ngày 13/01 đến 15/01/2025. Sinh viên tầng 2 vui lòng sử dụng nhà vệ sinh tầng 1 hoặc tầng 3 trong thời gian này.',
    type: 'Bảo trì', audience: 'SPECIFIC', priority: 3,
  },
  {
    title: 'Thông báo hoàn thành nâng cấp hệ thống wifi',
    content: 'Hệ thống wifi đã được nâng cấp thành công lên chuẩn WiFi 6. Tốc độ tải xuống tối đa đạt 500 Mbps. Sinh viên kết nối lại wifi và nhập mật khẩu mới được thông báo qua email đăng ký.',
    type: 'Bảo trì', audience: 'ALL', priority: 2,
  },

  // --- KHẨN CẤP ---
  {
    title: 'KHẨN: Cúp điện khẩn cấp toàn khu ký túc xá',
    content: 'Do sự cố kỹ thuật nghiêm trọng tại trạm biến áp, toàn khu ký túc xá sẽ mất điện từ 14h00 hôm nay. Đội kỹ thuật đang khắc phục. Dự kiến có điện trở lại sau 3-4 tiếng. Sinh viên không sử dụng nến để tránh hỏa hoạn.',
    type: 'Khẩn cấp', audience: 'ALL', priority: 5,
  },
  {
    title: 'KHẨN: Phát hiện rò rỉ gas tại khu bếp chung tòa B',
    content: 'Đã phát hiện rò rỉ gas tại khu bếp chung tầng 1 tòa B. Toàn bộ sinh viên tòa B vui lòng không sử dụng lửa, không bật công tắc điện và di chuyển ra khu vực an toàn ngay lập tức. Đội kỹ thuật đang xử lý.',
    type: 'Khẩn cấp', audience: 'SPECIFIC', priority: 5,
  },
  {
    title: 'KHẨN: Cảnh báo bão số 3 - Gia cố cửa sổ và ban công',
    content: 'Theo dự báo thời tiết, bão số 3 sẽ đổ bộ vào đêm nay. Tất cả sinh viên vui lòng đóng chặt cửa sổ, không ra ban công, cất đồ vật trên ban công vào trong phòng. Ban quản lý sẽ phát nước uống dự phòng tại tầng 1.',
    type: 'Khẩn cấp', audience: 'ALL', priority: 5,
  },
  {
    title: 'KHẨN: Phát hiện ca nghi nhiễm bệnh truyền nhiễm',
    content: 'Đã phát hiện 1 sinh viên nghi nhiễm bệnh truyền nhiễm tại tòa C. Ban quản lý phối hợp với y tế nhà trường tiến hành khử khuẩn. Sinh viên tòa C vui lòng đeo khẩu trang và hạn chế ra ngoài cho đến khi có thông báo mới.',
    type: 'Khẩn cấp', audience: 'SPECIFIC', priority: 5,
  },
  {
    title: 'KHẨN: Mất nước toàn khu do vỡ đường ống chính',
    content: 'Đường ống nước chính cấp cho toàn khu ký túc xá bị vỡ do thi công bên ngoài. Dự kiến mất nước từ 6-8 tiếng. Ban quản lý đã chuẩn bị xe bồn nước tại sân khu A. Sinh viên mang xô chậu xuống lấy nước dự trữ.',
    type: 'Khẩn cấp', audience: 'ALL', priority: 5,
  },
  {
    title: 'KHẨN: Cảnh báo trộm cắp trong khu ký túc xá',
    content: 'Trong 3 ngày qua đã xảy ra 2 vụ trộm cắp tài sản tại tòa A và tòa D. Sinh viên vui lòng khóa cửa phòng cẩn thận, không để tài sản có giá trị ở nơi dễ thấy. Mọi thông tin nghi vấn vui lòng báo ngay cho bảo vệ.',
    type: 'Khẩn cấp', audience: 'ALL', priority: 5,
  },
  {
    title: 'KHẨN: Diễn tập phòng cháy chữa cháy bắt buộc',
    content: 'Buổi diễn tập phòng cháy chữa cháy bắt buộc sẽ diễn ra vào 9h00 ngày 25/01/2025. Tất cả sinh viên phải tham gia. Khi nghe còi báo động, di chuyển ngay xuống sân tập trung theo hướng dẫn của ban quản lý.',
    type: 'Khẩn cấp', audience: 'ALL', priority: 4,
  },
  {
    title: 'KHẨN: Ngập lụt tầng hầm - Di chuyển xe lên tầng trên',
    content: 'Do mưa lớn kéo dài, tầng hầm để xe đang bị ngập. Sinh viên có xe máy gửi tầng hầm vui lòng di chuyển xe lên khu vực để xe tạm thời tại sân tòa A ngay lập tức để tránh hư hỏng.',
    type: 'Khẩn cấp', audience: 'ALL', priority: 5,
  },
  {
    title: 'KHẨN: Cảnh báo ngộ độc thực phẩm - Không ăn tại căng tin hôm nay',
    content: 'Đã có 5 sinh viên nhập viện do nghi ngờ ngộ độc thực phẩm sau khi ăn tại căng tin ký túc xá tối qua. Căng tin tạm thời đóng cửa để điều tra. Sinh viên có triệu chứng đau bụng, buồn nôn vui lòng đến trạm y tế ngay.',
    type: 'Khẩn cấp', audience: 'ALL', priority: 5,
  },
  {
    title: 'KHẨN: Thông báo kiểm tra hành chính đột xuất',
    content: 'Công an phường phối hợp với ban quản lý tiến hành kiểm tra hành chính đột xuất vào tối nay từ 20h00. Tất cả sinh viên phải có mặt tại phòng và chuẩn bị sẵn thẻ sinh viên và CCCD để xuất trình khi được yêu cầu.',
    type: 'Khẩn cấp', audience: 'ALL', priority: 4,
  },

  // --- KỶ LUẬT ---
  {
    title: 'Thông báo xử lý kỷ luật vi phạm nội quy tháng 12/2024',
    content: 'Ban quản lý thông báo kết quả xử lý kỷ luật tháng 12/2024: 5 sinh viên bị cảnh cáo do vi phạm giờ giới nghiêm, 3 sinh viên bị phạt tiền do hư hại tài sản. Danh sách chi tiết được gửi đến từng sinh viên liên quan.',
    type: 'Kỷ luật', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo tăng cường kiểm tra vi phạm sử dụng điện',
    content: 'Ban quản lý sẽ tăng cường kiểm tra việc sử dụng thiết bị điện không được phép (bếp điện, nồi cơm điện, máy sấy tóc công suất cao) từ tháng 2/2025. Vi phạm lần đầu bị cảnh cáo, lần 2 bị phạt 500.000 VNĐ.',
    type: 'Kỷ luật', audience: 'STUDENTS', priority: 3,
  },
  {
    title: 'Thông báo xử lý nghiêm hành vi cho người ngoài ở chung',
    content: 'Qua kiểm tra định kỳ, ban quản lý phát hiện một số trường hợp cho người không đăng ký ở chung. Đây là vi phạm nghiêm trọng. Sinh viên vi phạm sẽ bị đình chỉ hợp đồng và không được đăng ký lại trong 1 năm.',
    type: 'Kỷ luật', audience: 'STUDENTS', priority: 4,
  },
  {
    title: 'Thông báo quy định mới về điểm rèn luyện ký túc xá',
    content: 'Kể từ học kỳ 2 năm 2024-2025, điểm rèn luyện ký túc xá sẽ được tích hợp vào điểm rèn luyện toàn trường. Vi phạm nội quy ký túc xá sẽ bị trừ điểm rèn luyện theo quy định mới. Chi tiết xem tại bảng thông báo.',
    type: 'Kỷ luật', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo nhắc nhở giữ vệ sinh khu vực chung',
    content: 'Qua kiểm tra, nhiều khu vực chung (hành lang, nhà vệ sinh, khu bếp) chưa được giữ vệ sinh tốt. Ban quản lý nhắc nhở toàn thể sinh viên có ý thức giữ gìn vệ sinh chung. Phòng nào vi phạm sẽ bị trừ điểm thi đua.',
    type: 'Kỷ luật', audience: 'STUDENTS', priority: 2,
  },
  {
    title: 'Thông báo xử lý vi phạm gây ồn ào sau 22h',
    content: 'Trong tháng 1/2025, ban quản lý đã nhận được nhiều phản ánh về tình trạng gây ồn ào sau 22h. Các phòng vi phạm đã được lập biên bản. Tái phạm sẽ bị cảnh cáo chính thức và trừ điểm rèn luyện.',
    type: 'Kỷ luật', audience: 'STUDENTS', priority: 3,
  },
  {
    title: 'Thông báo kết quả xét duyệt khiếu nại kỷ luật tháng 11',
    content: 'Ban quản lý đã xem xét 3 đơn khiếu nại kỷ luật tháng 11/2024. Kết quả: 1 trường hợp được giảm mức kỷ luật, 2 trường hợp giữ nguyên quyết định. Sinh viên liên quan đã được thông báo trực tiếp.',
    type: 'Kỷ luật', audience: 'SPECIFIC', priority: 2,
  },
  {
    title: 'Thông báo cấm hút thuốc trong toàn khu ký túc xá',
    content: 'Kể từ ngày 01/02/2025, toàn khu ký túc xá là khu vực cấm hút thuốc hoàn toàn, kể cả ban công và cầu thang. Vi phạm lần đầu bị nhắc nhở, lần 2 bị phạt 200.000 VNĐ và trừ 5 điểm rèn luyện.',
    type: 'Kỷ luật', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo xử lý vi phạm nộp tiền trễ hạn nhiều lần',
    content: 'Có 8 sinh viên nộp tiền trễ hạn từ 3 lần trở lên trong năm 2024. Ban quản lý sẽ gửi thông báo chính thức đến từng sinh viên và phụ huynh. Tái phạm trong học kỳ 2 sẽ bị xem xét chấm dứt hợp đồng.',
    type: 'Kỷ luật', audience: 'SPECIFIC', priority: 4,
  },
  {
    title: 'Thông báo nhắc nhở đăng ký xe gửi đúng quy định',
    content: 'Nhiều sinh viên gửi xe không đăng ký hoặc gửi sai khu vực. Ban quản lý yêu cầu tất cả sinh viên có xe đăng ký tại văn phòng trước ngày 20/01/2025. Xe không đăng ký sẽ bị di chuyển ra ngoài khu vực.',
    type: 'Kỷ luật', audience: 'STUDENTS', priority: 2,
  },

  // --- THÊM THÔNG BÁO CHUNG (bổ sung đủ 100) ---
  {
    title: 'Thông báo khai giảng năm học 2025-2026',
    content: 'Ký túc xá thông báo lịch nhận phòng cho sinh viên năm học 2025-2026: từ ngày 01/09 đến 05/09/2025. Sinh viên mang theo hợp đồng, CCCD và biên lai đóng tiền cọc khi đến nhận phòng.',
    type: 'Thông báo chung', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo lịch trả phòng cuối học kỳ 1',
    content: 'Sinh viên không tiếp tục ở ký túc xá học kỳ 2 vui lòng trả phòng trước ngày 15/01/2025. Thủ tục trả phòng: dọn sạch đồ đạc, bàn giao chìa khóa và ký biên bản tại văn phòng ban quản lý.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 3,
  },
  {
    title: 'Thông báo tuyển dụng cộng tác viên ban quản lý',
    content: 'Ban quản lý ký túc xá tuyển 5 sinh viên cộng tác viên hỗ trợ công tác quản lý. Yêu cầu: sinh viên năm 2-4, GPA ≥ 2.5, có tinh thần trách nhiệm. Phụ cấp 500.000 VNĐ/tháng và được ưu tiên gia hạn hợp đồng.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 1,
  },
  {
    title: 'Thông báo lịch họp ban đại diện sinh viên ký túc xá',
    content: 'Cuộc họp ban đại diện sinh viên ký túc xá quý 1/2025 sẽ diễn ra vào 15h00 ngày 20/01/2025 tại phòng họp tầng 1 tòa A. Đại diện mỗi tầng vui lòng tham dự đầy đủ để phản ánh ý kiến sinh viên.',
    type: 'Thông báo chung', audience: 'SPECIFIC', priority: 2,
  },
  {
    title: 'Thông báo chương trình văn nghệ chào xuân 2025',
    content: 'Ký túc xá tổ chức đêm văn nghệ "Chào Xuân Ất Tỵ 2025" vào 19h00 ngày 23/01/2025 tại sân khu A. Sinh viên có tiết mục văn nghệ đăng ký trước ngày 18/01. Có quà tặng và bốc thăm trúng thưởng.',
    type: 'Thông báo chung', audience: 'ALL', priority: 2,
  },
  {
    title: 'Thông báo phát quà Tết cho sinh viên ở lại',
    content: 'Ban quản lý sẽ phát quà Tết cho sinh viên ở lại ký túc xá dịp Tết Nguyên Đán 2025 vào ngày 24/01/2025. Mỗi sinh viên nhận 1 phần quà trị giá 200.000 VNĐ. Vui lòng đến nhận tại văn phòng từ 9h00 đến 11h00.',
    type: 'Thông báo chung', audience: 'SPECIFIC', priority: 2,
  },
  {
    title: 'Thông báo kết quả bình xét thi đua học kỳ 1',
    content: 'Kết quả bình xét thi đua học kỳ 1 năm học 2024-2025: Tòa A đạt danh hiệu "Tòa xuất sắc", 15 phòng đạt danh hiệu "Phòng văn hóa". Danh sách chi tiết được niêm yết tại bảng thông báo mỗi tòa.',
    type: 'Thông báo chung', audience: 'ALL', priority: 1,
  },
  {
    title: 'Thông báo mở đăng ký học kỳ 2 năm học 2024-2025',
    content: 'Sinh viên có nhu cầu tiếp tục ở ký túc xá học kỳ 2 vui lòng gia hạn hợp đồng trên hệ thống từ ngày 05/01 đến 20/01/2025. Sau thời hạn này, phòng sẽ được phân bổ cho sinh viên mới đăng ký.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 3,
  },
  {
    title: 'Thông báo lắp đặt máy giặt tự động tại tòa C và D',
    content: 'Ban quản lý đã lắp đặt thêm 4 máy giặt tự động tại tầng 1 tòa C và tòa D. Phí sử dụng 15.000 VNĐ/mẻ giặt, thanh toán qua thẻ nạp tiền tại văn phòng. Máy hoạt động từ 6h00 đến 22h00 hàng ngày.',
    type: 'Thông báo chung', audience: 'ALL', priority: 2,
  },
  {
    title: 'Thông báo cập nhật ứng dụng quản lý ký túc xá',
    content: 'Hệ thống quản lý ký túc xá đã được cập nhật phiên bản mới với nhiều tính năng cải tiến: xem hóa đơn trực tuyến, gửi phản hồi có đính kèm ảnh, nhận thông báo push. Sinh viên đăng nhập lại để trải nghiệm.',
    type: 'Thông báo chung', audience: 'ALL', priority: 2,
  },
  {
    title: 'Thông báo khảo sát chất lượng dịch vụ ký túc xá',
    content: 'Ban quản lý gửi khảo sát chất lượng dịch vụ học kỳ 1/2025. Sinh viên vui lòng dành 5 phút điền khảo sát trực tuyến trước ngày 25/01/2025. Ý kiến của bạn giúp chúng tôi cải thiện chất lượng phục vụ.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 1,
  },
  {
    title: 'Thông báo bổ sung tủ đồ cá nhân tại khu giặt phơi',
    content: 'Ban quản lý đã lắp đặt thêm 50 tủ đồ cá nhân tại khu giặt phơi tầng thượng. Sinh viên đăng ký sử dụng tủ tại văn phòng, phí 20.000 VNĐ/tháng. Ưu tiên sinh viên chưa có tủ đăng ký trước.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 1,
  },
  {
    title: 'Thông báo tổ chức giải bóng đá mini ký túc xá',
    content: 'Ban đại diện sinh viên tổ chức giải bóng đá mini ký túc xá tháng 2/2025. Mỗi tòa đăng ký 1 đội (7 người). Đăng ký trước ngày 05/02/2025. Giải thưởng: 1 triệu đồng cho đội vô địch.',
    type: 'Thông báo chung', audience: 'ALL', priority: 1,
  },
  {
    title: 'Thông báo mở phòng đọc sách và học nhóm 24/7',
    content: 'Phòng đọc sách và học nhóm tầng 2 tòa A sẽ mở cửa 24/7 kể từ ngày 01/02/2025. Sinh viên sử dụng thẻ từ để vào. Phòng có wifi tốc độ cao, máy in và ổ cắm điện đầy đủ. Giữ yên lặng khi sử dụng.',
    type: 'Thông báo chung', audience: 'ALL', priority: 2,
  },
  {
    title: 'Thông báo chính sách ưu tiên phòng cho sinh viên xuất sắc',
    content: 'Từ học kỳ 2/2025, sinh viên có GPA ≥ 3.5 và điểm rèn luyện ≥ 90 sẽ được ưu tiên chọn phòng trước. Đây là chính sách khuyến khích học tập và rèn luyện của ban quản lý ký túc xá.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 2,
  },
  {
    title: 'Thông báo lịch kiểm tra phòng định kỳ tháng 2',
    content: 'Lịch kiểm tra phòng định kỳ tháng 2/2025: Tòa A ngày 10/02, Tòa B ngày 11/02, Tòa C ngày 12/02, Tòa D ngày 13/02. Tiêu chí đánh giá: vệ sinh, ngăn nắp, tình trạng tài sản và tuân thủ nội quy.',
    type: 'Thông báo chung', audience: 'ALL', priority: 2,
  },
  {
    title: 'Thông báo hỗ trợ tâm lý cho sinh viên mùa thi',
    content: 'Trung tâm hỗ trợ sinh viên mở dịch vụ tư vấn tâm lý miễn phí tại phòng 101 tòa A trong mùa thi. Lịch tư vấn: thứ 2, 4, 6 từ 14h00 đến 17h00. Đặt lịch qua hệ thống hoặc đến trực tiếp.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 2,
  },
  {
    title: 'Thông báo thay đổi quy trình đăng ký ở ký túc xá',
    content: 'Kể từ năm học 2025-2026, toàn bộ quy trình đăng ký ở ký túc xá sẽ thực hiện trực tuyến qua hệ thống. Không còn nhận hồ sơ giấy. Sinh viên cần chuẩn bị ảnh CCCD và ảnh chân dung để tải lên hệ thống.',
    type: 'Thông báo chung', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo tổng kết hoạt động ký túc xá năm 2024',
    content: 'Ban quản lý ký túc xá tổng kết năm 2024: tiếp nhận 1.200 sinh viên, xử lý 450 phản hồi, hoàn thành 30 hạng mục bảo trì. Cảm ơn sự hợp tác của toàn thể sinh viên. Chúc mừng năm mới 2025.',
    type: 'Thông báo chung', audience: 'ALL', priority: 1,
  },
  {
    title: 'Thông báo lịch nghỉ lễ 30/4 và 1/5 năm 2025',
    content: 'Ký túc xá hoạt động bình thường trong dịp nghỉ lễ 30/4 và 1/5/2025. Sinh viên về quê vui lòng thông báo cho ban quản lý và khóa cửa phòng cẩn thận. Bảo vệ trực 24/7 trong suốt kỳ nghỉ lễ.',
    type: 'Thông báo chung', audience: 'ALL', priority: 2,
  },

  // --- BẢO TRÌ (bổ sung) ---
  {
    title: 'Thông báo kiểm tra hệ thống điều hòa toàn khu',
    content: 'Đội kỹ thuật sẽ kiểm tra và vệ sinh toàn bộ điều hòa trong các phòng từ ngày 03/02 đến 07/02/2025. Mỗi phòng sẽ được thông báo lịch cụ thể qua tin nhắn. Sinh viên vui lòng có mặt tại phòng trong khung giờ được phân công.',
    type: 'Bảo trì', audience: 'ALL', priority: 2,
  },
  {
    title: 'Thông báo nâng cấp hệ thống khóa cửa thông minh',
    content: 'Ban quản lý sẽ thay thế toàn bộ khóa cơ học bằng khóa thẻ từ thông minh từ ngày 10/02 đến 28/02/2025. Sinh viên sẽ được cấp thẻ từ mới miễn phí. Thẻ cũ sẽ hết hiệu lực sau ngày 28/02/2025.',
    type: 'Bảo trì', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo sửa chữa mái che khu phơi đồ tòa B',
    content: 'Mái che khu phơi đồ tầng thượng tòa B bị hư hỏng do mưa bão sẽ được sửa chữa vào ngày 08/02/2025. Sinh viên tòa B vui lòng không phơi đồ tại khu vực này trong ngày 08/02 để đảm bảo an toàn thi công.',
    type: 'Bảo trì', audience: 'SPECIFIC', priority: 2,
  },
  {
    title: 'Thông báo bảo trì máy bơm nước tòa D',
    content: 'Máy bơm nước tòa D sẽ được bảo trì định kỳ vào ngày 05/02/2025 từ 6h00 đến 10h00. Nước sinh hoạt tòa D sẽ bị gián đoạn trong thời gian này. Sinh viên vui lòng trữ nước trước khi bảo trì.',
    type: 'Bảo trì', audience: 'SPECIFIC', priority: 3,
  },
  {
    title: 'Thông báo lắp đặt bình nóng lạnh năng lượng mặt trời',
    content: 'Ban quản lý sẽ lắp đặt hệ thống bình nóng lạnh năng lượng mặt trời cho toàn khu từ tháng 3/2025. Dự án sẽ giúp tiết kiệm 40% chi phí điện nước. Trong thời gian thi công, nước nóng có thể bị gián đoạn.',
    type: 'Bảo trì', audience: 'ALL', priority: 2,
  },

  // --- THANH TOÁN (bổ sung) ---
  {
    title: 'Thông báo hóa đơn tháng 3/2025 đã được tạo',
    content: 'Hóa đơn tháng 3/2025 đã được tạo và gửi đến từng sinh viên. Hạn thanh toán ngày 15/03/2025. Lưu ý: hóa đơn tháng này có thêm phí gửi xe điều chỉnh theo mức mới. Sinh viên kiểm tra kỹ trước khi thanh toán.',
    type: 'Thanh toán', audience: 'STUDENTS', priority: 3,
  },
  {
    title: 'Thông báo chính sách hoàn tiền khi trả phòng sớm',
    content: 'Sinh viên trả phòng trước hạn hợp đồng sẽ được hoàn lại tiền phòng theo số ngày còn lại, trừ phí xử lý hành chính 100.000 VNĐ. Yêu cầu thông báo trước ít nhất 7 ngày để ban quản lý sắp xếp.',
    type: 'Thanh toán', audience: 'STUDENTS', priority: 2,
  },
  {
    title: 'Thông báo thu tiền điện nước bổ sung tháng 11/2024',
    content: 'Do lỗi hệ thống, hóa đơn điện nước tháng 11/2024 của một số phòng bị tính thiếu. Ban quản lý sẽ thu bổ sung phần chênh lệch vào hóa đơn tháng 2/2025. Sinh viên liên quan đã được thông báo qua email.',
    type: 'Thanh toán', audience: 'SPECIFIC', priority: 3,
  },

  // --- KỶ LUẬT (bổ sung) ---
  {
    title: 'Thông báo xử lý vi phạm mang thú cưng vào ký túc xá',
    content: 'Ban quản lý phát hiện một số sinh viên nuôi thú cưng trong phòng vi phạm nội quy. Tất cả thú cưng phải được đưa ra ngoài trước ngày 20/01/2025. Vi phạm sau thời hạn sẽ bị xử lý kỷ luật theo quy định.',
    type: 'Kỷ luật', audience: 'STUDENTS', priority: 3,
  },
  {
    title: 'Thông báo tăng cường kiểm tra vệ sinh phòng ở',
    content: 'Từ tháng 2/2025, ban quản lý sẽ kiểm tra vệ sinh phòng ở 2 lần/tháng thay vì 1 lần như trước. Phòng không đạt tiêu chuẩn vệ sinh sẽ bị trừ điểm thi đua và nhắc nhở chính thức. Tiêu chí đánh giá được niêm yết tại bảng thông báo.',
    type: 'Kỷ luật', audience: 'STUDENTS', priority: 3,
  },
  {
    title: 'Thông báo xử lý vi phạm sử dụng rượu bia trong phòng',
    content: 'Qua kiểm tra đột xuất, ban quản lý phát hiện 4 trường hợp sử dụng rượu bia trong phòng ở. Các sinh viên vi phạm đã bị lập biên bản cảnh cáo. Tái phạm sẽ bị đình chỉ hợp đồng thuê phòng.',
    type: 'Kỷ luật', audience: 'STUDENTS', priority: 4,
  },
  {
    title: 'Thông báo nhắc nhở không tự ý sửa chữa tài sản phòng',
    content: 'Ban quản lý nhận được phản ánh một số sinh viên tự ý tháo dỡ, thay đổi tài sản trong phòng mà không xin phép. Hành vi này vi phạm hợp đồng và sẽ bị xử lý kỷ luật. Mọi yêu cầu sửa chữa vui lòng gửi qua hệ thống phản hồi.',
    type: 'Kỷ luật', audience: 'STUDENTS', priority: 3,
  },

  // --- THÔNG BÁO CHUNG (bổ sung đủ 100) ---
  {
    title: 'Thông báo mở cửa phòng gym miễn phí cho sinh viên ký túc xá',
    content: 'Phòng tập thể dục tại tầng 1 tòa D sẽ mở cửa miễn phí cho sinh viên ký túc xá từ ngày 01/02/2025. Giờ mở cửa: 6h00 - 8h00 và 17h00 - 21h00 hàng ngày. Sinh viên mang theo thẻ ký túc xá khi vào tập.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 2,
  },
  {
    title: 'Thông báo chương trình mentoring sinh viên năm nhất',
    content: 'Ban quản lý phối hợp tổ chức chương trình mentoring ghép đôi sinh viên năm nhất với sinh viên năm 3-4 có kinh nghiệm sống ký túc xá. Đăng ký tham gia trước ngày 25/01/2025 để được ghép đôi phù hợp.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 1,
  },
  {
    title: 'Thông báo lịch phát thẻ ký túc xá cho sinh viên mới',
    content: 'Sinh viên mới nhận phòng từ tháng 1/2025 vui lòng đến văn phòng ban quản lý để nhận thẻ ký túc xá từ ngày 06/01 đến 10/01/2025. Mang theo CCCD và hợp đồng thuê phòng. Phí làm thẻ: 50.000 VNĐ.',
    type: 'Thông báo chung', audience: 'SPECIFIC', priority: 3,
  },
  {
    title: 'Thông báo kết quả xét duyệt đơn đăng ký ở ký túc xá đợt 2',
    content: 'Ban quản lý đã hoàn thành xét duyệt đơn đăng ký đợt 2 năm học 2024-2025. Danh sách sinh viên được chấp nhận đã được gửi qua email. Sinh viên được chấp nhận vui lòng hoàn tất thủ tục nhận phòng trước ngày 20/01/2025.',
    type: 'Thông báo chung', audience: 'ALL', priority: 3,
  },
  {
    title: 'Thông báo tổ chức lớp học tiếng Anh miễn phí tại ký túc xá',
    content: 'Câu lạc bộ tiếng Anh ký túc xá tổ chức lớp học miễn phí mỗi tối thứ 3 và thứ 5 từ 19h00 đến 21h00 tại phòng sinh hoạt chung tầng 2 tòa A. Đăng ký tham gia qua ban đại diện sinh viên tòa A.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 1,
  },
  {
    title: 'Thông báo hướng dẫn sử dụng hệ thống quản lý ký túc xá mới',
    content: 'Hệ thống quản lý ký túc xá đã được nâng cấp toàn diện. Ban quản lý tổ chức buổi hướng dẫn sử dụng vào 15h00 ngày 08/01/2025 tại hội trường tầng 1. Sinh viên tham dự sẽ được hỗ trợ cài đặt và sử dụng ngay tại chỗ.',
    type: 'Thông báo chung', audience: 'ALL', priority: 2,
  },
  {
    title: 'Thông báo chính sách bảo hiểm tài sản cá nhân',
    content: 'Từ học kỳ 2/2025, sinh viên có thể đăng ký gói bảo hiểm tài sản cá nhân trong phòng ở với phí 50.000 VNĐ/học kỳ. Gói bảo hiểm bồi thường tối đa 5 triệu đồng cho tài sản bị mất cắp hoặc hư hỏng do thiên tai.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 1,
  },
  {
    title: 'Thông báo mở rộng giờ phục vụ văn phòng ban quản lý',
    content: 'Kể từ ngày 15/01/2025, văn phòng ban quản lý ký túc xá sẽ mở cửa từ 7h30 đến 17h30 các ngày trong tuần. Thứ 7 phục vụ từ 8h00 đến 12h00 để hỗ trợ sinh viên làm thủ tục hành chính.',
    type: 'Thông báo chung', audience: 'ALL', priority: 2,
  },
  {
    title: 'Thông báo tổ chức ngày hội việc làm cho sinh viên ký túc xá',
    content: 'Ban quản lý phối hợp với Trung tâm hỗ trợ việc làm tổ chức ngày hội việc làm bán thời gian dành riêng cho sinh viên ký túc xá vào ngày 26/01/2025. Hơn 20 doanh nghiệp tham gia tuyển dụng với nhiều vị trí phù hợp.',
    type: 'Thông báo chung', audience: 'STUDENTS', priority: 2,
  },
  {
    title: 'Thông báo kết quả kiểm tra phòng tháng 1/2025',
    content: 'Kết quả kiểm tra phòng tháng 1/2025: 85% phòng đạt tiêu chuẩn vệ sinh, 12% cần cải thiện, 3% không đạt. Các phòng không đạt đã được thông báo trực tiếp và có 7 ngày để khắc phục trước khi kiểm tra lại.',
    type: 'Thông báo chung', audience: 'ALL', priority: 2,
  },
];

// ============================================================
// HÀM TIỆN ÍCH
// ============================================================

function padId(n) {
  return `noti-${String(n).padStart(2, '0')}`;
}

function randDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d;
}

// ============================================================
// HÀM CHÍNH
// ============================================================

async function run() {
  const client = await pool.connect();
  try {
    const adminRes = await client.query(`SELECT id FROM users WHERE role != 'STUDENT' LIMIT 1`);
    const adminId = adminRes.rows[0]?.id || null;

    // Xóa dữ liệu cũ nếu có
    await client.query(`DELETE FROM notifications WHERE id LIKE 'noti-%'`);
    console.log('🗑️  Đã xóa thông báo cũ (noti-xx)');

    let count = 0;
    for (let i = 0; i < NOTIFICATIONS.length; i++) {
      const n = NOTIFICATIONS[i];
      const id = padId(i + 1);
      const createdAt = randDate(180);
      const publishedAt = new Date(createdAt.getTime() + Math.random() * 3600000);
      const expiresAt = new Date(publishedAt.getTime() + (30 + Math.floor(Math.random() * 60)) * 86400000);

      await client.query(`
        INSERT INTO notifications (
          id, title, content, type, target_audience,
          priority, created_by, is_published,
          published_at, expires_at, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
      `, [
        id,
        n.title,
        n.content,
        n.type,
        n.audience,
        n.priority,
        adminId,
        true,
        publishedAt,
        expiresAt,
        createdAt,
      ]);

      console.log(`  [${id}] ${n.type.padEnd(16)} — ${n.title.substring(0, 55)}...`);
      count++;
    }

    console.log(`\n✅ Đã tạo ${count} thông báo thành công`);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
