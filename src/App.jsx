import {
  BarChart3, Bell, BookOpen, CalendarDays, ChevronDown, CircleHelp, Clock3,
  FileText, Headphones, LayoutDashboard, Menu, MessageCircle, Phone, Settings,
  ShoppingCart, Target, Users, X, TrendingUp, CheckCircle2, MoreHorizontal,
  MicOff, Pause, PhoneOff, MapPin, UserRound, ChevronLeft, ChevronRight,
  Lightbulb, Save, RotateCw, CalendarCheck, CircleX, Voicemail, Timer,
  Search, History, ClipboardCheck, Undo2, Info, FileVideo, Eye, GraduationCap,
  Play, ArrowRight, MonitorPlay, Coins, UserCheck, Paperclip, Smile, Pin,
  Download, Plus, PanelLeftClose, PanelLeftOpen, Upload, ImagePlus, Building2, Camera,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

const mockNotify = (message) => window.dispatchEvent(new CustomEvent('salesflow:toast', { detail: message }))

const navItems = [
  ['Tổng quan', LayoutDashboard], ['Telesale', Phone], ['Khách tiềm năng', Users],
  ['Đơn hàng', ShoppingCart], ['Tài liệu đào tạo', BookOpen], ['Báo cáo', BarChart3],
]

const summaryCards = [
  { label: 'Tổng hoa hồng', value: '7.250.000đ', change: '+12,5%', icon: TrendingUp, tone: 'blue' },
  { label: 'Số đơn trung bình/ngày', value: '8 đơn', change: '+8,2%', icon: Target, tone: 'teal' },
  { label: 'Đơn đã chốt', value: '24 đơn', change: '+16,8%', icon: ShoppingCart, tone: 'blue' },
  { label: 'Đơn trả về', value: '2 đơn', change: '−4,3%', icon: FileText, tone: 'rose' },
]

const periodMockData = {
  'Hôm nay': { commission: '850.000đ', orders: '3 đơn', returned: '0 đơn', avg: '3 đơn', calls: '18', connections: '9', leads: '5', closed: '3', work: '2 giờ 35 phút', chart: [{date:'09:00',value:120},{date:'10:00',value:260},{date:'11:00',value:410},{date:'13:00',value:530},{date:'14:00',value:680},{date:'15:00',value:850}], rows: [['Hôm nay','2 giờ 35 phút','18','9','5','3','33,3%']] },
  '7 ngày gần nhất': { commission: '7.250.000đ', orders: '24 đơn', returned: '2 đơn', avg: '8 đơn', calls: '86', connections: '42', leads: '21', closed: '8', work: '7 giờ 30 phút', chart: [{date:'18/09',value:800},{date:'19/09',value:1100},{date:'20/09',value:950},{date:'21/09',value:1250},{date:'22/09',value:1600},{date:'23/09',value:1350},{date:'24/09',value:1700}], rows: [['24/09/2025','7 giờ 30 phút','86','42','21','8','19,0%'],['23/09/2025','7 giờ 15 phút','80','40','18','6','15,0%'],['22/09/2025','8 giờ','90','45','24','9','20,0%']] },
  'Tháng 09/2025': { commission: '21.450.000đ', orders: '82 đơn', returned: '6 đơn', avg: '9 đơn', calls: '748', connections: '356', leads: '173', closed: '82', work: '64 giờ 15 phút', chart: [{date:'Tuần 1',value:3600},{date:'Tuần 2',value:4900},{date:'Tuần 3',value:5200},{date:'Tuần 4',value:7750}], rows: [['30/09/2025','7 giờ 45 phút','96','44','23','9','20,5%'],['29/09/2025','8 giờ','91','42','19','8','19,0%'],['28/09/2025','7 giờ 30 phút','84','39','18','7','17,9%']] },
  'Tháng 10/2025': { commission: '12.800.000đ', orders: '47 đơn', returned: '3 đơn', avg: '8 đơn', calls: '412', connections: '198', leads: '92', closed: '47', work: '38 giờ 20 phút', chart: [{date:'Tuần 1',value:2800},{date:'Tuần 2',value:4100},{date:'Tuần 3',value:5900}], rows: [['14/10/2025','7 giờ 20 phút','83','40','18','8','20,0%'],['13/10/2025','8 giờ','89','43','20','9','20,9%'],['12/10/2025','7 giờ 15 phút','76','36','17','6','16,7%']] },
}

const performance = [
  { label: 'Thời gian làm việc', value: '7 giờ 30 phút', icon: Clock3 },
  { label: 'Tổng số cuộc gọi', value: '86', icon: Phone },
  { label: 'Kết nối', value: '42', icon: Users },
  { label: 'Khách tiềm năng', value: '21', icon: Target },
  { label: 'Đã chốt', value: '8', icon: CheckCircle2 },
]

const rows = [
  ['24/09/2025', '7 giờ 30 phút', '86', '42', '21', '8', '19,0%'],
  ['23/09/2025', '7 giờ 15 phút', '80', '40', '18', '6', '15,0%'],
  ['22/09/2025', '8 giờ', '90', '45', '24', '9', '20,0%'],
]

function Brand() {
  return <div className="brand brand-text"><span>SalesFlow</span></div>
}

function Sidebar({ open, close, page, setPage, collapsed, setCollapsed }) {
  return <aside className={`sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
    <div className="sidebar-top"><Brand /><button title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'} className="collapse-sidebar" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={20}/> : <PanelLeftClose size={20}/>}</button><button className="mobile-close" onClick={close}><X size={21} /></button></div>
    <div className="workspace"><span className="workspace-dot" /> <em>KHÔNG GIAN LÀM VIỆC</em></div>
    <nav>{navItems.map(([label, Icon], i) => <button title={label} onClick={() => { if (i < 6) setPage(['dashboard', 'telesale', 'leads', 'orders', 'training', 'reports'][i]); close() }} className={`nav-item ${page === (i === 0 ? 'dashboard' : i === 1 ? 'telesale' : i === 2 ? 'leads' : i === 3 ? 'orders' : i === 4 ? 'training' : i === 5 ? 'reports' : '') ? 'active' : ''}`} key={label}><Icon size={19} /><span>{label}</span></button>)}</nav>
    <div className="sidebar-bottom">
      <button title="Trò chuyện" onClick={() => { setPage('chat'); close() }} className={`nav-item ${page === 'chat' ? 'active' : ''}`}><MessageCircle size={19} /><span>Trò chuyện</span><i className="notify-dot" /></button>
      <button title="Cài đặt" onClick={() => { setPage('settings'); close() }} className={`nav-item ${page === 'settings' ? 'active' : ''}`}><Settings size={19} /><span>Cài đặt</span></button>
      <div className="support-card"><div className="support-icon"><Headphones size={20}/></div><div><strong>Cần hỗ trợ?</strong><span>Liên hệ quản trị viên</span></div><ChevronDown size={15}/></div>
    </div>
  </aside>
}

const callStats = [
  ['Thời gian làm việc', '02:35:18', Clock3, 'blue'], ['Tổng số cuộc gọi', '86', Phone, 'blue'],
  ['Kết nối thành công', '42', Users, 'green'], ['Đã chốt hôm nay', '8', ShoppingCart, 'blue'],
]

const appointmentRows = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00']
const resultOptions = [
  ['Khách tiềm năng', Users, 'green'], ['Đã chốt', ShoppingCart, 'blue'], ['Gọi lại', Timer, 'amber'], ['Không có nhu cầu', CircleX, 'gray'], ['Không nghe máy', Voicemail, 'gray'], ['Sai số', CircleX, 'gray'],
]

function StatusBadge({ n, tone }) { return <span className={`slot-count ${tone || (n ? 'available' : '')}`}>{n}</span> }

function Telesale() {
  const [result, setResult] = useState('Khách tiềm năng')
  const [muted, setMuted] = useState(false)
  const [note, setNote] = useState('')
  const [callback, setCallback] = useState('')
  const saveCall = () => { mockNotify(`Đã lưu kết quả: ${result}`); setNote(''); setCallback('') }
  return <div className="content telesale-content">
    <div className="page-title telesale-title"><div><p>Trung tâm cuộc gọi <span className="live-dot">● Đang sẵn sàng</span></p><h1>Telesale</h1></div><button className="help"><CircleHelp size={17}/> Phím tắt</button></div>
    <section className="call-stat-grid">{callStats.map(([label, value, Icon, tone]) => <article className={`call-stat ${tone}`} key={label}><div className="card-icon"><Icon size={21}/></div><div><p>{label}</p><strong>{value}</strong></div><BarChart3 size={19}/></article>)}</section>
    <div className="telesale-grid">
      <section className="call-panel schedule-panel"><div className="call-panel-heading"><div><p className="eyebrow">LỊCH LÀM VIỆC</p><h2>Slot hẹn đơn</h2></div><button className="icon-button"><MoreHorizontal size={19}/></button></div><div className="week-control"><button><ChevronLeft size={17}/></button><strong>05/10 — 07/10</strong><button><ChevronRight size={17}/></button></div><div className="slot-header"><span>Giờ</span><span>T2 <small>05/10</small></span><span>T3 <small>06/10</small></span><span>T4 <small>07/10</small></span></div><div className="slot-section">Ca sáng</div>{appointmentRows.slice(0, 6).map((time, i) => <div className="slot-row" key={time}><input type="checkbox"/><b>{time}</b><StatusBadge n={i===2?1:0}/><StatusBadge n={i===3?2:0}/><StatusBadge n={0}/></div>)}<div className="slot-section afternoon">Ca chiều</div>{appointmentRows.slice(6).map((time, i) => <div className="slot-row" key={time}><input type="checkbox"/><b>{time}</b><StatusBadge n={[2,0,1,0,4,1,3,0,1,2][i]}/><StatusBadge n={[1,0,1,2,1,0,1,0,2,1][i]}/><StatusBadge n={[0,0,0,0,2,1,0,1,0,3][i]}/></div>)}<button className="auto-dial"><RotateCw size={18}/> Tự động quay số</button></section>
      <div className="center-call-column"><section className="call-panel active-call"><div className="call-panel-heading"><div><p className="eyebrow">CUỘC GỌI HIỆN TẠI</p><h2>Điều khiển cuộc gọi</h2></div><span className="calling-status"><i/> Đang kết nối</span></div><div className="line-list"><span className="line active"><Phone size={14}/> Số 1 <b>Đang gọi</b></span><span className="line"><Phone size={14}/> Số 2 <b>Chờ gọi</b></span><span className="line"><Phone size={14}/> Số 3 <b>Chờ gọi</b></span></div><div className="caller"><div className="customer-avatar"><UserRound size={35}/></div><div><h3>Trần Thị Lan</h3><p><MapPin size={14}/> Cầu Giấy · Hà Nội</p></div><strong>00:01:24</strong></div><div className="caller-number"><Phone size={15}/> *** *** 4321</div><div className="call-controls"><button onClick={() => setMuted(!muted)} className={muted ? 'selected' : ''}><span><MicOff size={20}/></span>{muted ? 'Bật mic' : 'Tắt mic'}</button><button><span><Pause size={20}/></span>Giữ máy</button><button className="end"><span><PhoneOff size={20}/></span>Kết thúc</button></div></section>
      <section className="call-panel script-panel"><div className="call-panel-heading"><div><p className="eyebrow">KỊCH BẢN</p><h2>Kịch bản tư vấn</h2></div><button className="subtle-select">Bảo dưỡng / Thay lõi <ChevronDown size={15}/></button></div><ol><li>Em chào anh/chị, em gọi từ SalesFlow. Anh/chị có tiện trao đổi một chút về sản phẩm đang sử dụng không ạ?</li><li>Lần gần nhất mình thay lõi hoặc bảo dưỡng là khi nào ạ?</li><li>Máy có hiện tượng nước chảy yếu, có mùi lạ hoặc phát ra tiếng ồn không ạ?</li><li>Bên em có lịch kiểm tra tại nhà. Kỹ thuật viên sẽ báo giá trước khi thực hiện.</li></ol><button className="next-tip"><Lightbulb size={17}/> Gợi ý tiếp theo</button></section></div>
      <aside className="right-call-column"><section className="call-panel customer-panel"><div className="call-panel-heading"><div><p className="eyebrow">KHÁCH HÀNG</p><h2>Thông tin liên hệ</h2></div><button className="icon-button"><MoreHorizontal size={19}/></button></div><div className="customer-brief"><div className="customer-avatar small"><UserRound size={26}/></div><div><h3>Trần Thị Lan</h3><p><Phone size={13}/> *** *** 4321</p><p><MapPin size={13}/> Cầu Giấy · Hà Nội</p></div></div><div className="customer-details"><span>Loại máy <b>Chưa cập nhật</b></span><span>Lần thay lõi gần nhất <b>Chưa cập nhật</b></span></div><div className="history"><strong><Clock3 size={15}/> Lịch sử liên hệ</strong><p>Chưa có lịch sử liên hệ.</p></div></section>
      <section className="call-panel outcome-panel"><div className="call-panel-heading"><div><p className="eyebrow">KẾT QUẢ</p><h2>Kết quả cuộc gọi</h2></div></div><div className="result-grid">{resultOptions.map(([label, Icon, tone]) => <button onClick={() => setResult(label)} className={`${tone} ${result === label ? 'chosen' : ''}`} key={label}><Icon size={18}/>{label}</button>)}</div><label className="field-label"><CalendarCheck size={15}/> Lịch gọi lại<input value={callback} onChange={e=>setCallback(e.target.value)} placeholder="Chọn ngày và giờ" /></label><label className="field-label"><FileText size={15}/> Ghi chú<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Nhập ghi chú cuộc gọi..." /></label><button onClick={saveCall} className="save-result"><Save size={18}/> Lưu kết quả</button></section></aside>
    </div>
  </div>
}

const leadRows = [
  { name:'Trần Thị Lan', phone:'*** *** 4321', last:'04/10 · 09:15', care:'04/10 · 14:30', status:'Cần gọi lại', tone:'amber' },
  { name:'Nguyễn Văn Minh', phone:'*** *** 6789', last:'03/10 · 16:00', care:'05/10 · 09:00', status:'Đã hẹn lịch', tone:'green' },
  { name:'Lê Văn Hùng', phone:'*** *** 9012', last:'03/10 · 10:30', care:'04/10 · 15:00', status:'Đang tư vấn', tone:'blue' },
  { name:'Phạm Thị Mai', phone:'*** *** 5678', last:'02/10 · 14:00', care:'05/10 · 10:00', status:'Chờ xác nhận', tone:'purple' },
  { name:'Hoàng Văn Nam', phone:'*** *** 3456', last:'02/10 · 11:00', care:'06/10 · 14:30', status:'Cần gọi lại', tone:'amber' },
]
const leadStats = [['Tổng khách tiềm năng','42',Users,'blue'],['Cần chăm sóc hôm nay','12',CalendarCheck,'amber'],['Đã hẹn lịch','8',ClipboardCheck,'green'],['Đã chốt','6',ShoppingCart,'blue']]

function Leads() {
  const [activeLead, setActiveLead] = useState(leadRows[0])
  const [activeTab, setActiveTab] = useState('Tất cả (42)')
  const [outcome, setOutcome] = useState('Đang tư vấn')
  const [query, setQuery] = useState('')
  const tabs = ['Tất cả (42)', 'Cần chăm sóc (12)', 'Đã hẹn (8)']
  const visibleLeads = leadRows.filter(lead => `${lead.name} ${lead.phone}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')) && (activeTab.startsWith('Cần') ? lead.status === 'Cần gọi lại' : activeTab.startsWith('Đã hẹn') ? lead.status === 'Đã hẹn lịch' : true))
  return <div className="content leads-content">
    <div className="page-title telesale-title"><div><p>Quản lý và chăm sóc khách hàng <span className="live-dot">● 12 khách cần liên hệ</span></p><h1>Khách tiềm năng</h1></div><button className="help"><CircleHelp size={17}/> Hướng dẫn</button></div>
    <section className="call-stat-grid">{leadStats.map(([label,value,Icon,tone]) => <article className={`call-stat ${tone}`} key={label}><div className="card-icon"><Icon size={21}/></div><div><p>{label}</p><strong>{value}</strong></div><BarChart3 size={19}/></article>)}</section>
    <div className="leads-grid"><div className="lead-list-column"><section className="call-panel lead-list-panel"><div className="call-panel-heading"><div><p className="eyebrow">DANH SÁCH</p><h2>Danh sách khách tiềm năng</h2></div><button className="icon-button"><MoreHorizontal size={19}/></button></div><div className="lead-filters"><label><Search size={17}/><input placeholder="Tìm tên hoặc số điện thoại..." /></label><button>Trạng thái <ChevronDown size={15}/></button><button><CalendarDays size={15}/> Hôm nay <ChevronDown size={15}/></button></div><div className="lead-tabs">{tabs.map(tab=><button className={activeTab===tab?'active':''} onClick={()=>setActiveTab(tab)} key={tab}>{tab}</button>)}</div><div className="lead-table-wrap"><table className="lead-table"><thead><tr><th>Khách hàng</th><th>Liên hệ gần nhất</th><th>Lịch chăm sóc</th><th>Trạng thái</th></tr></thead><tbody>{leadRows.map((lead,i)=><tr className={activeLead.name===lead.name?'selected-row':''} onClick={()=>setActiveLead(lead)} key={lead.name}><td><div className="lead-name"><div className="tiny-avatar"><UserRound size={17}/></div><span><b>{lead.name}</b><small>{lead.phone}</small></span></div></td><td>{lead.last}</td><td>{lead.care}</td><td><span className={`lead-status ${lead.tone}`}>{lead.tone==='amber'?<Timer size={14}/>:lead.tone==='green'?<CalendarCheck size={14}/>:lead.tone==='blue'?<Phone size={14}/>:<History size={14}/>} {lead.status}</span></td></tr>)}</tbody></table></div><div className="pagination"><span>Hiển thị 1 – 5 trong 42 khách hàng</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>4</button><button>›</button></div></div></section><section className="call-panel timeline-panel"><div className="call-panel-heading"><div><p className="eyebrow">TƯƠNG TÁC</p><h2>Lịch sử chăm sóc ({activeLead.name})</h2></div><button className="subtle-select">Tất cả <ChevronDown size={14}/></button></div><div className="timeline"><div><i/><time>04/10/2026<br/><b>09:15</b></time><p>Khách quan tâm thay lõi, hẹn gọi lại vào buổi chiều.</p></div><div><i/><time>03/10/2026<br/><b>16:20</b></time><p>Đã tư vấn dịch vụ bảo dưỡng tại nhà.</p></div></div></section></div>
      <aside className="lead-detail-column"><section className="call-panel lead-detail"><div className="call-panel-heading"><div><p className="eyebrow">HỒ SƠ KHÁCH HÀNG</p><h2>Chi tiết khách hàng</h2></div><button className="icon-button"><MoreHorizontal size={19}/></button></div><div className="customer-brief lead-brief"><div className="customer-avatar small"><UserRound size={26}/></div><div><h3>{activeLead.name}</h3><p><Phone size={13}/> {activeLead.phone}</p><p><MapPin size={13}/> Cầu Giấy · Hà Nội</p></div></div><div className="customer-details"><span>Nhu cầu <b>Thay lõi / Bảo dưỡng</b></span><span>Loại máy <b>Chưa cập nhật</b></span><span>Trạng thái <b className="amber-text"><Timer size={13}/> {activeLead.status}</b></span></div><button className="contact-button"><Phone size={18}/> Gọi khách hàng</button></section><section className="call-panel care-form"><div className="call-panel-heading"><div><p className="eyebrow">CẬP NHẬT</p><h2>Chăm sóc khách hàng</h2></div></div><div className="appointment-fields"><label>Ngày hẹn <span><CalendarDays size={15}/><input value="04/10/2026" readOnly/><ChevronDown size={14}/></span></label><label>Giờ hẹn <span><Clock3 size={15}/><input value="14:30" readOnly/><ChevronDown size={14}/></span></label></div><p className="result-label">Kết quả chăm sóc</p><div className="result-grid lead-outcomes">{[['Đang tư vấn',Phone,'blue'],['Đã hẹn lịch',CalendarCheck,'green'],['Đã chốt',ShoppingCart,'rose'],['Gọi lại',Timer,'amber'],['Chưa có nhu cầu',Voicemail,'gray'],['Không liên lạc được',CircleX,'purple']].map(([label,Icon,tone])=><button className={`${tone} ${outcome===label?'chosen':''}`} onClick={()=>setOutcome(label)} key={label}><Icon size={17}/>{label}</button>)}</div><label className="field-label">Ghi chú<textarea defaultValue="Khách muốn kiểm tra máy và được báo giá trước." /></label><button className="save-result"><Save size={18}/> Lưu cập nhật</button></section></aside></div>
  </div>
}

const orders = [
  ['DH001','Trần Thị Lan','*** *** 4321','Thay lõi','05/10 · 08:30','Đã hẹn','green'],
  ['DH002','Nguyễn Văn Minh','*** *** 6789','Bảo dưỡng','05/10 · 14:30','Đã xác nhận','purple'],
  ['DH003','Lê Văn Hùng','*** *** 9012','Thay lõi','06/10 · 09:00','Đã hẹn','green'],
  ['DH004','Phạm Thị Mai','*** *** 5678','Kiểm tra máy','06/10 · 15:00','Đã xác nhận','purple'],
  ['DH005','Hoàng Văn Nam','*** *** 3456','Bảo dưỡng','07/10 · 10:00','Đã hẹn','green'],
  ['DH006','Nguyễn Thị Hoa','*** *** 2468','Thay lõi','07/10 · 16:30','Đã hẹn','green'],
]

function Orders() {
  const [activeOrder, setActiveOrder] = useState(orders[0])
  const [tab, setTab] = useState('Tất cả (24)')
  const orderStats = [['Tổng đơn đã hẹn','24',ShoppingCart,'blue'],['T2 · 05/10','8 đơn',CalendarCheck,'amber'],['T3 · 06/10','9 đơn',ClipboardCheck,'green'],['T4 · 07/10','7 đơn',CalendarCheck,'blue']]
  return <div className="content orders-content"><div className="page-title telesale-title"><div><p>Lịch hẹn đã chốt trong 3 ngày tới <span className="live-dot">● 24 đơn đang chờ phục vụ</span></p><h1>Đơn hàng</h1></div><button className="help"><CircleHelp size={17}/> Hướng dẫn</button></div><section className="call-stat-grid">{orderStats.map(([label,value,Icon,tone])=><article className={`call-stat ${tone}`} key={label}><div className="card-icon"><Icon size={21}/></div><div><p>{label}</p><strong>{value}</strong></div><BarChart3 size={19}/></article>)}</section><div className="orders-grid"><div className="order-list-column"><section className="call-panel order-list-panel"><div className="call-panel-heading"><div><p className="eyebrow">LỊCH HẸN</p><h2>Danh sách đơn hàng</h2></div><button className="icon-button"><MoreHorizontal size={19}/></button></div><div className="order-filters"><label><Search size={17}/><input placeholder="Tìm mã đơn, tên hoặc số điện thoại..." /></label><button>Trạng thái lịch hẹn <ChevronDown size={15}/></button></div><div className="lead-tabs order-tabs">{['Tất cả (24)','T2 · 05/10 (8)','T3 · 06/10 (9)','T4 · 07/10 (7)'].map(x=><button className={tab===x?'active':''} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div><div className="lead-table-wrap"><table className="lead-table order-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Dịch vụ</th><th>Lịch hẹn</th><th>Trạng thái</th></tr></thead><tbody>{orders.map(order=><tr onClick={()=>setActiveOrder(order)} className={activeOrder[0]===order[0]?'selected-row':''} key={order[0]}><td><b className="order-code">{order[0]}</b></td><td><div className="lead-name"><div className="tiny-avatar"><UserRound size={17}/></div><span><b>{order[1]}</b><small>{order[2]}</small></span></div></td><td>{order[3]}</td><td>{order[4]}</td><td><span className={`lead-status ${order[6]}`}>{order[6]==='green'?<CalendarCheck size={14}/>:<History size={14}/>} {order[5]}</span></td></tr>)}</tbody></table></div><div className="pagination"><span>Hiển thị 1 – 6 trong 24 đơn hàng</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>4</button><button>›</button></div></div></section><div className="order-note"><Info size={20}/><div><strong>Lưu ý lịch hẹn</strong><p>Danh sách chỉ hiển thị đơn đã chốt, có lịch hẹn từ 05/10 đến 07/10/2026.</p></div></div></div><aside className="order-detail-column"><section className="call-panel lead-detail"><div className="call-panel-heading"><div><p className="eyebrow">ĐƠN HÀNG</p><h2>Chi tiết đơn hàng</h2></div><span className="order-live"><i/> Đã chốt</span></div><div className="order-id">{activeOrder[0]}</div><div className="customer-brief lead-brief"><div className="customer-avatar small"><UserRound size={26}/></div><div><h3>{activeOrder[1]}</h3><p><Phone size={13}/> {activeOrder[2]}</p><p><MapPin size={13}/> Cầu Giấy · Hà Nội</p></div></div><div className="customer-details"><span>Dịch vụ <b>{activeOrder[3]}</b></span><span>Ngày hẹn <b>05/10/2026</b></span><span>Giờ hẹn <b>08:30</b></span><span>Trạng thái lịch hẹn <b className="green-text"><CalendarCheck size={13}/> {activeOrder[5]}</b></span></div><button className="contact-button"><Phone size={18}/> Gọi xác nhận</button></section><section className="call-panel care-form"><div className="call-panel-heading"><div><p className="eyebrow">ĐIỀU CHỈNH</p><h2>Điều chỉnh lịch hẹn</h2></div></div><div className="appointment-fields"><label>Ngày hẹn <span><CalendarDays size={15}/><input value="05/10/2026" readOnly/><ChevronDown size={14}/></span></label><label>Giờ hẹn <span><Clock3 size={15}/><input value="08:30" readOnly/><ChevronDown size={14}/></span></label></div><label className="field-label">Ghi chú<textarea defaultValue="Khách yêu cầu kiểm tra máy và báo giá trước khi thay lõi." /></label><button className="save-result"><Save size={18}/> Lưu cập nhật</button><button className="return-order"><Undo2 size={18}/> Đơn trả về</button></section></aside></div></div>
}

const materials = [
  ['Quy trình telesale','Các bước gọi, tư vấn và ghi nhận kết quả.',FileText,'PDF · 12 trang','pdf'],
  ['Kịch bản tư vấn','Bảo dưỡng, thay lõi và xử lý từ chối.',FileText,'PDF · 8 trang','doc'],
  ['Kiến thức máy lọc nước','Cấu tạo máy và chức năng các lõi lọc.',GraduationCap,'PDF · 15 trang','course'],
  ['Quy trình hẹn đơn','Chọn slot và xác nhận lịch với khách.',CalendarDays,'PDF · 6 trang','calendar'],
  ['Kỹ năng chăm sóc khách hàng','Cách khai thác nhu cầu và theo dõi khách.',FileVideo,'Video · 08:30','video'],
  ['Hướng dẫn sử dụng hệ thống','Dashboard, Telesale, CSKH và Đơn hàng.',MonitorPlay,'Video · 06:45','video'],
]

function Training() {
  const [category, setCategory] = useState('Tất cả')
  const categories = ['Tất cả','Nghiệp vụ telesale','Kịch bản tư vấn','Kiến thức sản phẩm','Video hướng dẫn']
  return <div className="content training-content"><div className="page-title training-title"><div><p>Kiến thức và hướng dẫn dành cho nhân viên telesale</p><h1>Tài liệu đào tạo</h1></div><label className="training-search"><Search size={18}/><input placeholder="Tìm tài liệu, video, kịch bản..." /></label></div><div className="training-tabs">{categories.map(item=><button key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div><div className="training-grid"><div className="material-column"><section className="call-panel materials-panel"><div className="call-panel-heading"><div><p className="eyebrow">THƯ VIỆN</p><h2>Tài liệu dành cho bạn</h2></div><span className="materials-count">06 tài liệu</span></div><div className="materials-list">{materials.map(([title,desc,Icon,meta,tone])=><article className="material-card" key={title}><div className={`material-icon ${tone}`}><Icon size={35}/></div><div className="material-copy"><h3>{title}</h3><p>{desc}</p><div><span><FileText size={14}/>{meta}</span><button>{tone==='video'?<Play size={14}/>:<Eye size={15}/>} {tone==='video'?'Xem video':'Xem tài liệu'}</button></div></div></article>)}</div></section><div className="training-tip"><Info size={21}/><div><strong>Lưu ý nghiệp vụ</strong><ul><li>Kiểm tra slot trống trước khi xác nhận lịch hẹn.</li><li>Ghi nhận đầy đủ nội dung sau mỗi cuộc gọi.</li></ul></div></div></div><aside className="training-side"><section className="call-panel getting-started"><div className="call-panel-heading"><div><p className="eyebrow">LỘ TRÌNH</p><h2>Bắt đầu tại đây</h2></div></div>{[['Đọc quy trình telesale','Hiểu các bước gọi, tư vấn và ghi nhận kết quả.',FileText,'blue'],['Nắm kiến thức sản phẩm','Tìm hiểu cấu tạo máy và chức năng các lõi lọc.',GraduationCap,'green'],['Luyện kịch bản tư vấn','Thực hành các tình huống tư vấn và xử lý từ chối.',FileText,'amber'],['Thực hành hẹn đơn','Chọn slot và xác nhận lịch với khách.',CalendarDays,'rose']].map(([title,desc,Icon,tone],i)=><button className="journey-step" key={title}><b className={tone}>{i+1}</b><span className={`journey-icon ${tone}`}><Icon size={19}/></span><span><strong>{title}</strong><small>{desc}</small></span><ArrowRight size={17}/></button>)}</section><section className="call-panel updated-materials"><div className="call-panel-heading"><div><p className="eyebrow">MỚI CẬP NHẬT</p><h2>Tài liệu mới cập nhật</h2></div><button className="see-all">Xem tất cả <ArrowRight size={13}/></button></div>{[['Quy trình hẹn đơn','04/10/2026',FileText],['Kịch bản xử lý từ chối','03/10/2026',FileText],['Hướng dẫn chăm sóc khách','02/10/2026',FileVideo]].map(([title,date,Icon])=><div className="updated-row" key={title}><Icon size={16}/><span>{title}</span><time>{date}</time></div>)}</section><section className="training-help"><MessageCircle size={21}/><div><strong>Cần hỗ trợ?</strong><span>Trao đổi với quản lý hoặc nhóm nội bộ.</span></div><button><MessageCircle size={16}/> Mở Chat</button></section></aside></div></div>
}

const reportPeriods = [
  { label: '01/10/2026 — 04/10/2026', multiplier: 1, days: 4, chart: ['01/10', '02/10', '03/10', '04/10'] },
  { label: '05/10/2026 — 11/10/2026', multiplier: .84, days: 7, chart: ['05/10', '06/10', '07/10', '08/10', '09/10', '10/10', '11/10'] },
  { label: 'Tháng 09/2026', multiplier: 5.2, days: 30, chart: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'] },
]
const reportStaff = [
  { name: 'Nguyễn Văn A', hours: 24, calls: 300, connected: 150, leads: 75, closed: 30, returned: 2, commission: 2750000 },
  { name: 'Trần Thị Lan', hours: 24, calls: 280, connected: 140, leads: 70, closed: 28, returned: 1, commission: 2500000 },
  { name: 'Lê Văn Hùng', hours: 24, calls: 280, connected: 130, leads: 65, closed: 22, returned: 2, commission: 2000000 },
]
const reportEmployeeOptions = ['Tất cả nhân viên', ...reportStaff.map(person => person.name)]
const money = value => `${new Intl.NumberFormat('vi-VN').format(Math.round(value))}đ`
const asNumber = (value, multiplier) => Math.round(value * multiplier)

function buildReportData(periodName, employee) {
  const period = reportPeriods.find(item => item.label === periodName) || reportPeriods[0]
  const people = employee === 'Tất cả nhân viên' ? reportStaff : reportStaff.filter(person => person.name === employee)
  const scale = period.multiplier
  const totals = people.reduce((sum, person) => ({
    hours: sum.hours + asNumber(person.hours, scale), calls: sum.calls + asNumber(person.calls, scale), connected: sum.connected + asNumber(person.connected, scale),
    leads: sum.leads + asNumber(person.leads, scale), closed: sum.closed + asNumber(person.closed, scale), returned: sum.returned + asNumber(person.returned, scale), commission: sum.commission + Math.round(person.commission * scale),
  }), { hours: 0, calls: 0, connected: 0, leads: 0, closed: 0, returned: 0, commission: 0 })
  const ratio = people.reduce((sum, person) => sum + person.calls, 0) / reportStaff.reduce((sum, person) => sum + person.calls, 0)
  const baseCalls = period.chart.length === 4 ? [200, 220, 210, 230] : period.chart.length === 7 ? [118, 132, 125, 143, 137, 149, 156] : [1740, 1920, 1810, 2005]
  const baseOrders = period.chart.length === 4 ? [18, 20, 19, 23] : period.chart.length === 7 ? [11, 13, 12, 14, 13, 16, 17] : [158, 176, 166, 190]
  const chart = period.chart.map((day, index) => ({ day, calls: Math.max(1, Math.round(baseCalls[index] * scale * ratio)), orders: Math.max(0, Math.round(baseOrders[index] * scale * ratio)) }))
  const appointments = [8, 9, 7].map((amount, index) => Math.max(0, Math.round(amount * scale * ratio + (index === 1 ? .2 : 0))))
  return { period, people, totals, chart, appointments, care: Math.max(1, Math.round(12 * scale * ratio)), consulting: Math.max(1, Math.round(18 * scale * ratio)) }
}

function ReportChart({ values }) {
  const maxCalls = Math.max(50, Math.ceil(Math.max(...values.map(item => item.calls)) / 50) * 50)
  const maxOrders = Math.max(1, Math.max(...values.map(item => item.orders)))
  const scaleLabels = Array.from({ length: 6 }, (_, index) => Math.round(maxCalls - (maxCalls / 5) * index))
  return <section className="call-panel report-chart"><div className="call-panel-heading"><div><p className="eyebrow">PHÂN TÍCH</p><h2>Xu hướng cuộc gọi & đơn chốt</h2></div><div className="chart-legend"><span><i className="blue"/> Cuộc gọi</span><span><i className="green"/> Đơn chốt</span></div></div><div className="modern-chart"><div className="chart-scale">{scaleLabels.map(label => <span key={label}>{label}</span>)}</div><div className="bar-groups" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>{values.map(item=><div className="bar-group" key={item.day}><div className="bar-zone"><span className="call-bar" title={`${item.calls} cuộc gọi`} style={{height:`${(item.calls / maxCalls) * 100}%`}}><b>{item.calls}</b></span><span className="order-bar" title={`${item.orders} đơn chốt`} style={{height:`${(item.orders / maxOrders) * 100}%`}}><b>{item.orders}</b></span></div><small>{item.day}</small></div>)}</div></div><p className="chart-footnote">Dữ liệu mô phỏng được cập nhật theo bộ lọc đang chọn.</p></section>
}

function Reports() {
  const [period, setPeriod] = useState(reportPeriods[0].label)
  const [employee, setEmployee] = useState('Tất cả nhân viên')
  const data = buildReportData(period, employee)
  const { totals } = data
  const metrics = [['Thời gian làm việc',`${totals.hours} giờ`,Clock3,'blue'],['Tổng số cuộc gọi',totals.calls,Phone,'green'],['Kết nối',totals.connected,Users,'blue'],['Khách tiềm năng',totals.leads,UserCheck,'amber'],['Đơn đã chốt',totals.closed,ShoppingCart,'green'],['Đơn trả về',totals.returned,Undo2,'rose'],['Số đơn trung bình/ngày',Math.max(0, Math.round(totals.closed / data.period.days)),BarChart3,'blue'],['Tổng hoa hồng',money(totals.commission),Coins,'amber']]
  const appointmentDays = ['T2 · 05/10','T3 · 06/10','T4 · 07/10']
  const applyFilters = () => mockNotify(`Đã áp dụng báo cáo: ${employee} · ${period}`)
  return <div className="content reports-content"><div className="page-title report-title"><div><p>Dành cho quản lý · Dữ liệu minh họa</p><h1>Báo cáo tổng hợp</h1></div><div className="report-filters"><label className="report-select"><CalendarDays size={16}/><select value={period} onChange={event => setPeriod(event.target.value)} aria-label="Chọn khoảng thời gian">{reportPeriods.map(item => <option key={item.label}>{item.label}</option>)}</select></label><label className="report-select"><Users size={16}/><select value={employee} onChange={event => setEmployee(event.target.value)} aria-label="Chọn nhân viên">{reportEmployeeOptions.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={14}/></label><button className="apply" onClick={applyFilters}>Áp dụng</button></div></div><section className="report-filter-note"><Info size={14}/> Đang xem: <b>{employee}</b> · <span>{period}</span></section><section className="report-metrics">{metrics.map(([label,value,Icon,tone])=><article key={label} className={`report-metric ${tone}`}><div className="report-icon"><Icon size={22}/></div><div><p>{label}</p><strong>{value}</strong></div></article>)}</section><div className="report-main-grid"><ReportChart values={data.chart}/><section className="call-panel upcoming"><div className="call-panel-heading"><div><p className="eyebrow">LỊCH HẸN</p><h2>Lịch hẹn 3 ngày tới</h2></div></div><div className="upcoming-days">{appointmentDays.map((day,index)=><div className={['blue','green','amber'][index]} key={day}><CalendarDays size={17}/><span>{day}</span><b>{data.appointments[index]} đơn</b></div>)}</div><div className="total-booked"><CalendarDays size={21}/><span>Tổng đơn đã hẹn:</span><strong>{data.appointments.reduce((sum, value) => sum + value, 0)}</strong></div><div className="upcoming-bottom"><div><UserCheck size={21}/><span>Cần chăm sóc <b>{data.care} khách</b></span></div><div><MessageCircle size={21}/><span>Đang tư vấn <b>{data.consulting} khách</b></span></div></div></section></div><section className="call-panel staff-report"><div className="call-panel-heading"><div><p className="eyebrow">BẢNG CHI TIẾT</p><h2>Hiệu suất theo nhân viên</h2></div><button className="subtle-select">Xuất báo cáo <ChevronDown size={14}/></button></div><div className="table-wrap"><table className="report-table"><thead><tr>{['Nhân viên','Thời gian','Cuộc gọi','Kết nối','Tiềm năng','Đã chốt','Trả về','Tỷ lệ chốt','Hoa hồng'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{data.people.map(person => { const row = { hours: asNumber(person.hours, data.period.multiplier), calls: asNumber(person.calls, data.period.multiplier), connected: asNumber(person.connected, data.period.multiplier), leads: asNumber(person.leads, data.period.multiplier), closed: asNumber(person.closed, data.period.multiplier), returned: asNumber(person.returned, data.period.multiplier), commission: Math.round(person.commission * data.period.multiplier) }; return <tr key={person.name}><td>{person.name}</td><td>{row.hours} giờ</td><td>{row.calls}</td><td>{row.connected}</td><td>{row.leads}</td><td>{row.closed}</td><td>{row.returned}</td><td>{row.connected ? `${(row.closed / row.connected * 100).toFixed(1).replace('.', ',')}%` : '0%'}</td><td>{money(row.commission)}</td></tr> })}<tr className="total-row">{['Tổng',`${totals.hours} giờ`,totals.calls,totals.connected,totals.leads,totals.closed,totals.returned,totals.connected ? `${(totals.closed / totals.connected * 100).toFixed(1).replace('.', ',')}%` : '0%',money(totals.commission)].map((value,index)=><td key={index}>{value}</td>)}</tr></tbody></table></div><p className="report-caption"><Info size={14}/> Tỷ lệ chốt = Đơn đã chốt / Kết nối. Dữ liệu là mô phỏng, sẵn sàng thay bằng API.</p></section></div>
}

const contacts = [
  ['Nhóm Telesale','Quản lý: Mọi người nhớ ghi chú…','11:00','group','3'],
  ['Điều phối kỹ thuật','Lê Văn Hùng: Đã xử lý xong','10:32','green','2'],
  ['Thông báo nội bộ','Phòng HCNS: Lịch nghỉ lễ 20/10…','08:15','amber',''],
  ['Nguyễn Văn A','Dạ, em sẽ liên hệ lại khách.','10:47','blue',''],
  ['Trần Thị Lan','Cảm ơn anh!','10:38','rose',''],
  ['Lê Văn Hùng','Đã gửi file anh xem nhé.','09:55','purple',''],
]

function Chat() {
  const [active, setActive] = useState('Nhóm Telesale')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState([])
  const handleSend = () => { if (message.trim()) { setSent([...sent, message.trim()]); setMessage('') } }
  return <div className="chat-page"><div className="chat-title"><div><p>Trao đổi công việc giữa nhân viên và quản lý <span>· Nội dung minh họa</span></p><h1>Chat nội bộ</h1></div></div><div className="chat-layout"><aside className="chat-list"><div className="chat-list-head"><h2>Hội thoại</h2><button><Plus size={18}/></button></div><label className="chat-search"><Search size={17}/><input placeholder="Tìm người hoặc nhóm..." /></label><div className="chat-filter"><button className="active">Tất cả</button><button>Chưa đọc</button></div><p className="chat-section">NHÓM</p>{contacts.slice(0,3).map(([name,preview,time,tone,unread])=><button onClick={()=>setActive(name)} className={`contact ${active===name?'active':''}`} key={name}><div className={`contact-avatar ${tone}`}>{tone==='group'||tone==='green'||tone==='amber'?<Users size={22}/>:name.split(' ').map(x=>x[0]).slice(-2).join('')}</div><div><strong>{name}</strong><span>{preview}</span></div><time>{time}{unread&&<b>{unread}</b>}</time></button>)}<p className="chat-section private">TIN NHẮN RIÊNG</p>{contacts.slice(3).map(([name,preview,time,tone])=><button onClick={()=>setActive(name)} className={`contact ${active===name?'active':''}`} key={name}><div className={`contact-avatar ${tone}`}>{name.split(' ').map(x=>x[0]).slice(-2).join('')}<i/></div><div><strong>{name}</strong><span>{preview}</span></div><time>{time}</time></button>)}</aside><main className="chat-room"><header className="chat-room-head"><div className="contact-avatar group"><Users size={24}/></div><div><h2>{active}</h2><p>8 thành viên · <i/> 3 đang online</p></div><span/><button><Search size={19}/></button><button><MoreHorizontal size={20}/></button></header><div className="pinned-message"><Pin size={16}/><b>Tin ghim:</b> Xác nhận slot trước khi hẹn khách.<ArrowRight size={16}/></div><section className="messages"><div className="date-divider"><span>Hôm nay, 04/10/2026</span></div><div className="message incoming"><div className="message-avatar blue">NA</div><div><p><b>Nguyễn Văn A</b><time>10:45</time></p><span>Em đã xác nhận 3 lịch hẹn sáng mai và cập nhật vào Đơn hàng.</span></div></div><div className="message incoming"><div className="message-avatar rose">TL</div><div><p><b>Trần Thị Lan</b><time>10:48</time></p><span>Slot 14:30 ngày 05/10 còn chỗ không ạ?</span></div></div><div className="message outgoing"><div><p><b>Quản lý</b><time>10:50</time></p><span>Còn 2 slot. Em kiểm tra lại bảng Slot hẹn đơn trước khi xác nhận với khách nhé.</span></div><div className="message-avatar manager">QL</div></div><div className="message incoming"><div className="message-avatar rose">TL</div><div><p><b>Trần Thị Lan</b><time>10:51</time></p><span>Dạ, em đã kiểm tra và xác nhận lịch với khách.</span></div></div><div className="message incoming"><div className="message-avatar purple">LH</div><div><p><b>Lê Văn Hùng</b><time>10:55</time></p><div className="shared-file"><FileText size={25}/><span><b>Quy_trinh_hen_don.pdf</b><small>Tài liệu hướng dẫn</small></span><Download size={20}/></div></div></div><div className="message outgoing"><div><p><b>Quản lý</b><time>11:00</time></p><span>Mọi người nhớ ghi chú đầy đủ sau mỗi cuộc gọi.</span><small className="seen">✓✓ Đã xem</small></div><div className="message-avatar manager">QL</div></div>{sent.map((item,i)=><div className="message outgoing" key={i}><div><span>{item}</span></div><div className="message-avatar manager">QL</div></div>)}</section><div className="message-input"><button><Paperclip size={20}/></button><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()} placeholder="Nhập tin nhắn nội bộ..."/><button><Smile size={21}/></button><button onClick={handleSend} className="send-button">Gửi</button></div></main><aside className="chat-info"><h2>Thông tin nhóm</h2><div className="chat-group-info"><div className="contact-avatar group"><Users size={25}/></div><div><strong>Nhóm Telesale</strong><span>8 thành viên</span></div></div><section><div className="info-heading"><h3>Thành viên</h3><button>Xem tất cả <ArrowRight size={14}/></button></div>{[['QL','Quản lý','Quản trị viên','manager'],['NA','Nguyễn Văn A','','blue'],['TL','Trần Thị Lan','','rose'],['LH','Lê Văn Hùng','','purple']].map(([init,name,role,tone])=><div className="member" key={name}><div className={`message-avatar ${tone}`}>{init}<i/></div><span>{name}</span>{role&&<b>{role}</b>}</div>)}</section><section className="pinned-info"><h3>Tin nhắn đã ghim</h3><p><Pin size={16}/> Xác nhận slot trước khi hẹn khách.</p></section><section className="shared-info"><div className="info-heading"><h3>Tệp đã chia sẻ</h3><button>Xem tất cả <ArrowRight size={14}/></button></div>{[['Quy_trinh_hen_don.pdf','Tài liệu hướng dẫn','10:55 04/10/2026'],['Kich_ban_tu_van.pdf','Kịch bản tư vấn khách hàng','09:20 04/10/2026']].map(([file,desc,date])=><div className="info-file" key={file}><FileText size={25}/><span><b>{file}</b><small>{desc}<br/>{date}</small></span><Download size={18}/></div>)}</section></aside></div></div>
}

function SettingsPage() {
  const [form, setForm] = useState({ phone: '0901 234 567', bank: 'Vietcombank', account: '1028 6688 9999', holder: 'NGUYEN VAN A' })
  const [savedForm, setSavedForm] = useState(form)
  const [files, setFiles] = useState({ qr: null, front: null, left: null, right: null })
  const updateFile = (key, file) => { if (file) setFiles(current => ({ ...current, [key]: { name: file.name, url: URL.createObjectURL(file) } })) }
  const photoCards = [['front', 'Chính diện'], ['left', 'Nghiêng mặt bên trái'], ['right', 'Nghiêng mặt bên phải']]
  return <div className="content settings-content"><div className="page-title"><div><p>Thông tin cá nhân và tài khoản nhận hoa hồng</p><h1>Cài đặt</h1></div><button className="help"><CircleHelp size={17}/> Hướng dẫn</button></div><section className="settings-hero"><div className="settings-avatar"><UserRound size={42}/><label><Camera size={15}/><input type="file" accept="image/*" onChange={e=>updateFile('avatar',e.target.files[0])}/></label></div><div><p className="eyebrow">TÀI KHOẢN CỦA TÔI</p><h2>Hồ sơ cá nhân</h2><span><UserCheck size={15}/> Nhân viên telesale</span></div><div className="settings-status"><i/> Tài khoản đã xác thực</div></section><div className="settings-top-grid"><section className="call-panel account-panel"><div className="call-panel-heading"><div><p className="eyebrow">THÔNG TIN NHẬN TIỀN</p><h2>Thông tin tài khoản</h2></div></div><div className="settings-fields"><label><Phone size={18}/><span>Số điện thoại</span><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label><Building2 size={18}/><span>Ngân hàng nhận</span><select value={form.bank} onChange={e=>setForm({...form,bank:e.target.value})}><option>Vietcombank</option><option>Techcombank</option><option>MB Bank</option><option>ACB</option></select></label><label><FileText size={18}/><span>Số tài khoản ngân hàng</span><input value={form.account} onChange={e=>setForm({...form,account:e.target.value})}/></label><label><UserRound size={18}/><span>Tên chủ tài khoản</span><input value={form.holder} onChange={e=>setForm({...form,holder:e.target.value.toUpperCase()})}/></label></div></section><section className="call-panel qr-panel"><div className="call-panel-heading"><div><p className="eyebrow">THANH TOÁN</p><h2>Mã QR tài khoản ngân hàng</h2></div></div><label className={`upload-area ${files.qr?'has-file':''}`}>{files.qr?<img src={files.qr.url} alt="Mã QR ngân hàng"/>:<ImagePlus size={42}/>}<strong>{files.qr?files.qr.name:'Tải ảnh mã QR lên'}</strong><small>{files.qr?'Đã chọn ảnh mã QR':'PNG, JPG · tối đa 5MB'}</small><span><Upload size={16}/> Chọn tệp</span><input type="file" accept="image/*" onChange={e=>updateFile('qr',e.target.files[0])}/></label></section></div><section className="call-panel portrait-panel"><div className="call-panel-heading"><div><p className="eyebrow">XÁC THỰC DANH TÍNH</p><h2>Ảnh chân dung</h2><span className="portrait-hint">Tải lên ảnh rõ mặt theo ba góc chụp.</span></div></div><div className="portrait-grid">{photoCards.map(([key,label])=><label className={`portrait-upload ${files[key]?'has-file':''}`} key={key}>{files[key]?<img src={files[key].url} alt={label}/>:<UserRound size={50}/>}<strong>{label}</strong><span><Upload size={15}/> Chọn ảnh</span><small>{files[key]?files[key].name:'Chưa có tệp được chọn'}</small><input type="file" accept="image/*" onChange={e=>updateFile(key,e.target.files[0])}/></label>)}</div><div className="settings-actions"><button onClick={()=>{setForm(savedForm);setFiles({qr:null,front:null,left:null,right:null});mockNotify('Đã hủy các thay đổi')}}><Undo2 size={17}/> Hủy thay đổi</button><button className="save-settings" onClick={()=>{setSavedForm(form);mockNotify('Đã lưu thông tin tài khoản mock')}}><Save size={17}/> Lưu thay đổi</button></div></section></div>
}


function Chart({ series }) {
  const [active, setActive] = useState(series.length - 1)
  useEffect(() => setActive(series.length - 1), [series])
  const chartMax = Math.ceil(Math.max(...series.map(item => item.value)) / 500) * 500
  const step = series.length > 1 ? 852 / (series.length - 1) : 0
  const points = series.map((item, index) => `${55 + index * step},${234 - (item.value / chartMax) * 210}`).join(' ')
  const activePoint = series[active]
  return <section className="panel chart-panel new-chart-panel"><div className="panel-heading"><div><p className="eyebrow">DOANH THU</p><h2>Hoa hồng theo ngày</h2></div><div className="chart-summary"><span>Ngày {activePoint.date}</span><strong>{new Intl.NumberFormat('vi-VN').format(activePoint.value * 1000)}đ</strong><button className="subtle-select">7 ngày gần nhất <ChevronDown size={16}/></button></div></div>
    <div className="commission-chart" role="img" aria-label="Biểu đồ hoa hồng"><div className="commission-axis">{[chartMax,chartMax*.75,chartMax*.5,chartMax*.25,0].map(value=><span key={value}>{value ? `${(value/1000).toLocaleString('vi-VN')}tr` : '0'}</span>)}</div><svg viewBox="0 0 940 270" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="commissionArea" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#2d7be8" stopOpacity=".24"/><stop offset="1" stopColor="#2d7be8" stopOpacity=".01"/></linearGradient></defs><g className="commission-grid"><line x1="35" x2="915" y1="24" y2="24"/><line x1="35" x2="915" y1="76" y2="76"/><line x1="35" x2="915" y1="129" y2="129"/><line x1="35" x2="915" y1="181" y2="181"/><line x1="35" x2="915" y1="234" y2="234"/></g><path d={`M ${points.split(' ').join(' L ')} L ${55+(series.length-1)*step},234 L 55,234 Z`} fill="url(#commissionArea)"/><polyline points={points} fill="none" stroke="#2473dc" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>{series.map((item,index)=>{ const x=55+index*step, y=234-(item.value/chartMax)*210; return <g className="commission-point" onClick={()=>setActive(index)} key={item.date}><circle cx={x} cy={y} r={active===index?8:6} fill="#fff" stroke="#2473dc" strokeWidth="3"/><text x={x} y={y-17} textAnchor="middle">{(item.value/1000).toLocaleString('vi-VN')}tr</text><text className="commission-date" x={x} y="260" textAnchor="middle">{item.date}</text></g>})}</svg></div>
  </section>
}

function App() {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [page, setPage] = useState('dashboard')
  const [toast, setToast] = useState('')
  const [dialog, setDialog] = useState(null)
  const [period, setPeriod] = useState('Tháng 09/2025')
  const [dateOpen, setDateOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifications, setNotifications] = useState([
    { id: 1, title: '03 lịch hẹn cần xác nhận', detail: 'Trần Thị Lan · 05/10 lúc 08:30', page: 'orders' },
    { id: 2, title: 'Báo cáo ngày đã sẵn sàng', detail: '860 cuộc gọi · 80 đơn đã chốt', page: 'reports' },
    { id: 3, title: '12 khách cần chăm sóc', detail: 'Ưu tiên gọi lại trước 16:00 hôm nay', page: 'leads' },
  ])
  useEffect(() => {
    const onToast = (event) => {
      setToast(event.detail)
      window.clearTimeout(window.__salesFlowToast)
      window.__salesFlowToast = window.setTimeout(() => setToast(''), 2600)
    }
    window.addEventListener('salesflow:toast', onToast)
    return () => window.removeEventListener('salesflow:toast', onToast)
  }, [])
  const handleMockClick = (event) => {
    const button = event.target.closest('button')
    if (!button || button.closest('.sidebar') || button.dataset.silent) return
    const label = button.textContent.replace(/\s+/g, ' ').trim()
    if (label === 'Cần chăm sóc (12)' || label === 'Đã hẹn (8)' || label === 'Tất cả (42)') {
      const term = label.startsWith('Cần') ? 'Cần gọi lại' : label.startsWith('Đã hẹn') ? 'Đã hẹn lịch' : ''
      document.querySelectorAll('.lead-table tbody tr').forEach(row => { row.hidden = term ? !row.textContent.includes(term) : false })
      mockNotify(term ? `Đang hiển thị ${term}: dữ liệu mock` : 'Đang hiển thị toàn bộ khách hàng mock')
      return
    }
    if (label.startsWith('T2 ·') || label.startsWith('T3 ·') || label.startsWith('T4 ·') || label === 'Tất cả (24)') {
      const date = label.startsWith('T2') ? '05/10' : label.startsWith('T3') ? '06/10' : label.startsWith('T4') ? '07/10' : ''
      document.querySelectorAll('.order-table tbody tr').forEach(row => { row.hidden = date ? !row.textContent.includes(date) : false })
      mockNotify(date ? `Đang hiển thị lịch hẹn ${date}: dữ liệu mock` : 'Đang hiển thị tất cả đơn hàng mock')
      return
    }
    if (['Nghiệp vụ telesale','Kịch bản tư vấn','Kiến thức sản phẩm','Video hướng dẫn','Tất cả'].includes(label) && button.closest('.training-tabs')) {
      const keys = { 'Nghiệp vụ telesale':'Quy trình telesale', 'Kịch bản tư vấn':'Kịch bản tư vấn', 'Kiến thức sản phẩm':'Kiến thức máy lọc nước', 'Video hướng dẫn':'Video' }
      document.querySelectorAll('.material-card').forEach(card => { card.hidden = label === 'Tất cả' ? false : !card.textContent.includes(keys[label]) })
      mockNotify(`Đã lọc ${label}: dữ liệu mock`)
      return
    }
    if ((label === 'Tất cả' || label === 'Chưa đọc') && button.closest('.chat-filter')) {
      document.querySelectorAll('.contact').forEach(contact => { contact.hidden = label === 'Chưa đọc' && !contact.querySelector('time b') })
      mockNotify(label === 'Chưa đọc' ? 'Đang hiển thị 5 hội thoại chưa đọc mock' : 'Đang hiển thị tất cả hội thoại mock')
      return
    }
    if (label === 'Mở Chat') { setPage('chat'); mockNotify('Đã mở Chat nội bộ'); return }
    if (label.includes('Xem tài liệu') || label.includes('Xem video')) { setDialog({ title: label.includes('video') ? 'Video hướng dẫn' : 'Tài liệu đào tạo', type: label.includes('video') ? 'video' : 'document' }); return }
    if (label.includes('Gọi khách') || label.includes('Gọi xác nhận') || label.includes('quay số')) { setDialog({ title: 'Xác nhận cuộc gọi', type: 'call' }); return }
    if (label.includes('Xuất báo cáo')) {
      const csv = 'Nhân viên,Cuộc gọi,Kết nối,Đã chốt\nNguyễn Văn A,300,150,30\nTrần Thị Lan,280,140,28\nLê Văn Hùng,280,130,22'
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
      const link = document.createElement('a'); link.href = url; link.download = 'bao-cao-salesflow.csv'; link.click(); URL.revokeObjectURL(url)
      mockNotify('Đã tải báo cáo CSV mẫu'); return
    }
    if (label && !button.classList.contains('send-button')) mockNotify(`${label} · Đã xử lý bằng dữ liệu mô phỏng`)
  }
  const handleMockInput = (event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement) || !input.placeholder) return
    const query = input.value.trim().toLocaleLowerCase('vi')
    const selector = input.placeholder.includes('Tìm tên') ? '.lead-table tbody tr' : input.placeholder.includes('Tìm mã') ? '.order-table tbody tr' : input.placeholder.includes('Tìm tài liệu') ? '.material-card' : input.placeholder.includes('Tìm người') ? '.contact' : ''
    if (!selector) return
    document.querySelectorAll(selector).forEach((node) => { node.hidden = !node.textContent.toLocaleLowerCase('vi').includes(query) })
  }
  const isTelesale = page === 'telesale'
  const isLeads = page === 'leads'
  const isOrders = page === 'orders'
  const isTraining = page === 'training'
  const isReports = page === 'reports'
  const isChat = page === 'chat'
  const isSettings = page === 'settings'
  const dashboardData = periodMockData[period] || periodMockData['7 ngày gần nhất']
  const dashboardValue = (label, fallback) => ({ 'Tổng hoa hồng': dashboardData.commission, 'Số đơn trung bình/ngày': dashboardData.avg, 'Đơn đã chốt': dashboardData.orders, 'Đơn trả về': dashboardData.returned }[label] || fallback)
  const performanceValue = (label, fallback) => ({ 'Thời gian làm việc': dashboardData.work, 'Tổng số cuộc gọi': dashboardData.calls, 'Kết nối': dashboardData.connections, 'Khách tiềm năng': dashboardData.leads, 'Đã chốt': dashboardData.closed }[label] || fallback)
  const pageTitle = isTelesale ? 'Telesale' : isLeads ? 'Khách tiềm năng' : isOrders ? 'Đơn hàng' : isTraining ? 'Tài liệu đào tạo' : isReports ? 'Báo cáo' : isChat ? 'Chat nội bộ' : isSettings ? 'Cài đặt' : 'Tổng quan'
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`} onClickCapture={handleMockClick} onInputCapture={handleMockInput}><Sidebar open={open} close={() => setOpen(false)} page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} /><main><header className="topbar"><button className="menu-button" onClick={() => setOpen(true)}><Menu/></button><div className="crumb"><span>Không gian làm việc</span><ChevronDown size={14}/><strong>{pageTitle}</strong></div><div className="top-actions"><div className="header-popover-wrap"><button data-silent onClick={()=>{setDateOpen(!dateOpen);setNotificationOpen(false);setProfileOpen(false)}} className="date-picker"><CalendarDays size={18}/><span>{period}</span><ChevronDown size={16}/></button>{dateOpen&&<div className="header-popover period-menu"><b>Chọn kỳ hiển thị</b>{['Hôm nay','7 ngày gần nhất','Tháng 09/2025','Tháng 10/2025'].map(item=><button key={item} onClick={()=>{setPeriod(item);setDateOpen(false);mockNotify(`Đã chuyển sang ${item}`)}}>{item}</button>)}</div>}</div><div className="header-popover-wrap"><button data-silent onClick={()=>{setNotificationOpen(!notificationOpen);setDateOpen(false);setProfileOpen(false)}} className="bell"><Bell size={20}/>{notifications.length>0&&<b>{notifications.length}</b>}</button>{notificationOpen&&<div className="header-popover notification-menu"><b>Thông báo mới</b>{notifications.length?notifications.map(item=><button className="notification-item" key={item.id} onClick={()=>{setPage(item.page);setNotifications(current=>current.filter(x=>x.id!==item.id));setNotificationOpen(false)}}><strong>{item.title}</strong><span>{item.detail}</span></button>):<p className="empty-notification">Bạn đã xem tất cả thông báo.</p>}<button className="mark-read" onClick={()=>{setNotifications([]);mockNotify('Đã đánh dấu tất cả là đã đọc')}}>Đánh dấu tất cả là đã đọc</button></div>}</div><div className="header-popover-wrap"><button data-silent onClick={()=>{setProfileOpen(!profileOpen);setDateOpen(false);setNotificationOpen(false)}} className="profile"><div className="avatar">NA</div><div><strong>Nguyễn Văn A</strong><span>Telesale</span></div><ChevronDown size={16}/></button>{profileOpen&&<div className="header-popover profile-menu"><button onClick={()=>mockNotify('Hồ sơ mock: Nguyễn Văn A · Telesale · 86 cuộc gọi hôm nay')}>Hồ sơ cá nhân</button><button onClick={()=>mockNotify('Cài đặt mock đã sẵn sàng')}>Cài đặt</button><button onClick={()=>mockNotify('Đã đăng xuất phiên mock')}>Đăng xuất</button></div>}</div></div></header>
    {isTelesale ? <Telesale /> : isLeads ? <Leads /> : isOrders ? <Orders /> : isTraining ? <Training /> : isReports ? <Reports /> : isChat ? <Chat /> : isSettings ? <SettingsPage /> : <div className="content"><div className="page-title"><div><p>Xin chào, Nguyễn Văn A <span>👋</span></p><h1>Tổng quan công việc</h1></div><button className="help"><CircleHelp size={17}/> Hướng dẫn</button></div>
      <section className="summary-section"><div className="section-caption"><h2>Tổng quan · {period}</h2><span>Dữ liệu mock được cập nhật theo kỳ</span></div><div className="summary-grid">{summaryCards.map(({label,value,change,icon:Icon,tone})=><article className={`summary-card ${tone}`} key={label}><div className="card-icon"><Icon size={22}/></div><div><p>{label}</p><strong>{dashboardValue(label,value)}</strong><small className={change.includes('−')?'down':''}>{change} so với kỳ trước</small></div><button><MoreHorizontal size={19}/></button></article>)}</div></section>
      <Chart series={dashboardData.chart} />
      <section className="panel performance-panel"><div className="panel-heading"><div><p className="eyebrow">HIỆU SUẤT</p><h2>Hiệu suất làm việc</h2></div><button className="subtle-select">Xem báo cáo <ChevronDown size={16}/></button></div><div className="metric-grid">{performance.map(({label,value,icon:Icon})=><div className="metric" key={label}><div className="metric-icon"><Icon size={20}/></div><div><span>{label}</span><strong>{performanceValue(label,value)}</strong></div></div>)}</div><div className="table-wrap"><table><thead><tr>{['Ngày','Thời gian làm việc','Tổng số cuộc gọi','Kết nối','Khách tiềm năng','Đã chốt','Tỷ lệ chốt'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{dashboardData.rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j} className={j===6?'rate':''}>{j===5?<span className="closed">{c}</span>:c}</td>)}</tr>)}</tbody></table></div></section>
    </div>}<footer><span><i/> Hệ thống hoạt động ổn định</span><span>© 2025 SalesFlow</span></footer></main><div className={`overlay ${open?'show':''}`} onClick={()=>setOpen(false)} />{toast && <div className="mock-toast"><CheckCircle2 size={17}/>{toast}</div>}{dialog && <div className="mock-dialog-backdrop" onClick={()=>setDialog(null)}><section className="mock-dialog" onClick={e=>e.stopPropagation()}><button className="dialog-close" onClick={()=>setDialog(null)}><X size={19}/></button><div className="dialog-icon">{dialog.type==='video'?<Play size={27}/>:dialog.type==='call'?<Phone size={27}/>:<FileText size={27}/>}</div><p className="eyebrow">{dialog.type==='call'?'CUỘC GỌI MÔ PHỎNG':'NỘI DUNG MÔ PHỎNG'}</p><h2>{dialog.title}</h2><p>{dialog.type==='video' ? 'Video đào tạo đang ở chế độ xem thử. Khi tích hợp API, đây sẽ là nguồn video thực tế.' : dialog.type==='call' ? 'Hệ thống sẽ mở phiên gọi thử tới khách hàng. Kết quả sẽ hiển thị ngay sau khi xác nhận.' : 'Nội dung PDF đang ở chế độ xem thử. Khi tích hợp API, hệ thống sẽ tải tài liệu thật tại đây.'}</p><button className="dialog-primary" onClick={()=>{setDialog(null);mockNotify(dialog.type==='call'?'Đang kết nối cuộc gọi mô phỏng…':'Đã ghi nhận tiến độ học tài liệu')}}>{dialog.type==='video'?'Bắt đầu xem':dialog.type==='call'?'Bắt đầu gọi':'Đánh dấu đã đọc'}</button></section></div>}</div>
}

export default App
