import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isBetween from 'dayjs/plugin/isBetween'
import relativeTime from 'dayjs/plugin/relativeTime'

// Thiết lập locale Tiếng Việt và các plugins xử lý lịch hẹn
dayjs.locale('vi')
dayjs.extend(customParseFormat)
dayjs.extend(relativeTime)
dayjs.extend(isBetween)

export default dayjs
