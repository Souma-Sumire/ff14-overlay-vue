import { ElMessageBox } from 'element-plus'
import { onMounted, ref, watch } from 'vue'
import actWS from '@/assets/actWS.webp'
import { callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'

function isIE() {
  const userAgent = window.navigator.userAgent
  const isMSIE = userAgent.includes('MSIE ') // IE 10 及以下
  const isTrident = userAgent.includes('Trident/') // IE 11
  return isMSIE || isTrident
}

function addOverlayWsParam() {
  const currentUrl = window.location.href
  const [basePart, hashPart = ''] = currentUrl.split('#')
  const [hashPath, hashQuery = ''] = hashPart.split('?')
  const searchParams = new URLSearchParams(hashQuery)
  let newHashQuery = ''
  searchParams.forEach((value, key) => {
    if (key !== 'OVERLAY_WS') {
      newHashQuery += `${key}=${encodeURIComponent(value)}&`
    }
  })
  newHashQuery += `OVERLAY_WS=ws://127.0.0.1:10501/ws`

  let newUrl = basePart!
  if (hashPath) {
    newUrl += `#${hashPath}`
    if (newHashQuery) {
      newUrl += `?${newHashQuery}`
    }
  }

  window.location.href = newUrl
  location.reload()
}

export function useWebSocket(
  config: {
    allowClose: boolean
    addWsParam: boolean
  } = { allowClose: false, addWsParam: true }
) {
  const wsConnected = ref(undefined as boolean | undefined)
  const userIgnoredWarning = ref(false)
  const useType = ref('overlay' as 'overlay' | 'websocket')
  let timer: number | null = null

  function check() {
    Promise.race([
      callOverlayHandler({ call: 'getLanguage' }),
      new Promise((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout'))
        }, 1000)
      }),
    ])
      .then(() => {
        if (timer) {
          clearTimeout(timer)
        }
        if (window.location.href.includes('OVERLAY_WS')) {
          wsConnected.value = true
          useType.value = 'websocket'
        }
      })
      .catch(() => {
        wsConnected.value = false
        useType.value = 'overlay'
      })
  }

  if (window.location.href.includes('OVERLAY_WS')) {
    timer = window.setInterval(() => {
      check()
    }, 3000)
  }

  function handleDisconnection() {
    if (!userIgnoredWarning.value) {
      ElMessageBox.close()
      ElMessageBox.alert(
        `请按照下图设置<img src='${actWS}' style='width:100%'><ul><li>若使用呆萌整合 ACT，需要启动过一次 FF14 游戏本体，OverlayPlugin悬浮窗插件才能成功加载（表现为可以正常查看悬浮窗的列表而非显示一片空白仅有下半控制台）。加载完成后可以关闭游戏。（有意见请找呆萌）</li><li>若 10501 端口被占用，可以随便换一个端口再试（需同时修改网页 url 参数与上图中的“端口”设置）。</li><ul>`,
        config.allowClose ? '未连接到 ACT' : '未连接到 ACT，无法使用',
        {
          dangerouslyUseHTMLString: true,
          closeOnClickModal: false,
          showClose: false,
          closeOnPressEscape: false,
          closeOnHashChange: false,
          showCancelButton: config.allowClose,
          showConfirmButton: false,
          cancelButtonText: '用不了也要看',
          buttonSize: 'small',
        }
      ).catch(() => {
        userIgnoredWarning.value = true
        if (timer) clearInterval(timer)
      })
    }
  }
  onMounted(() => {
    if (isIE()) {
      ElMessageBox.alert(
        '不支持 IE 浏览器，请使用 Chrome、Firefox、Edge 等现代浏览器访问。',
        '提示',
        {
          type: 'error',
          showConfirmButton: false,
          showClose: false,
        }
      )
      return
    }
    watch(wsConnected, (value) => {
      if (value) {
        ElMessageBox.close()
      } else {
        handleDisconnection()
      }
    })
    if (!window.location.href.includes('OVERLAY_WS') && config.addWsParam) {
      addOverlayWsParam()
    }
    check()
  })

  return { wsConnected, useType }
}
