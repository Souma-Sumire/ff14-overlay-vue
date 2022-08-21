import Swal from "sweetalert2";
import "sweetalert2/src/sweetalert2.scss";
export default (function () {
  setTimeout(() => {
    if (!Object.prototype.hasOwnProperty.call(window, "OverlayPluginApi")) {
      Swal.fire({
        title: "未检测到OverlayPlugin环境",
        text: "请在ACT的悬浮窗插件中添加本网页",
        icon: "warning",
        confirmButtonColor: "#d33",
        confirmButtonText: "我就要在这用！",
      });
    }
  }, 1000);
})();
