import Swal from 'sweetalert2'
import '@sweetalert2/theme-bootstrap-4/bootstrap-4.scss'

export function pleaseUseACT(callback = () => {}) {
  void Swal.fire('该页面需要在ACT悬浮窗中添加才可正常工作哦').finally(() => callback())
}
