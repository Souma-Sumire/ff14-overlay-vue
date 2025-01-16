import actWS from '@/assets/actWS.webp'
import { ElMessageBox } from 'element-plus'
import { onMounted, ref, watch } from 'vue'
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

  let newUrl = basePart
  if (hashPath) {
    newUrl += `#${hashPath}`
    if (newHashQuery) {
      newUrl += `?${newHashQuery}`
    }
  }

  window.location.href = newUrl
  location.reload()
}

export function useWebSocket(config: {
  allowClose: boolean
  addWsParam: boolean
} = { allowClose: false, addWsParam: true }) {
  const wsConnected = ref(undefined as boolean | undefined)
  const userIgnoredWarning = ref(false)
  const useType = ref(undefined as 'overlay' | 'websocket' | undefined)

  function check() {
    Promise.race([
      callOverlayHandler({ call: 'cactbotRequestState' }),
      new Promise((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout'))
        }, 1000)
      }),
    ])
      .then(() => {
        wsConnected.value = true
      })
      .catch(() => {
        wsConnected.value = false
      })
  }

  function handleDisconnection() {
    if (!userIgnoredWarning.value) {
      ElMessageBox.alert(
        `请按照下图设置<img src='${actWS}' style='width:100%'>`,
        config.allowClose ? '未连接到 ACT' : '未连接到 ACT，无法使用',
        {
          dangerouslyUseHTMLString: true,
          closeOnClickModal: false,
          showClose: false,
          closeOnPressEscape: false,
          closeOnHashChange: false,
          showCancelButton: config.allowClose,
          showConfirmButton: false,
          cancelButtonText: '我偏要看看',
          buttonSize: 'small',
        },
      ).catch(() => {
        userIgnoredWarning.value = true
      })
    }
  }
  onMounted(() => {
    if (isIE()) {
      ElMessageBox.alert('不支持 IE 浏览器，请使用 Chrome、Firefox、Edge 等现代浏览器访问。', '提示', {
        type: 'error',
        showConfirmButton: false,
        showClose: false,
      })
      return
    }
    watch(wsConnected, (value) => {
      if (value) {
        ElMessageBox.close()
      }
      else {
        handleDisconnection()
      }
    })
    if (!window.location.href.includes('OVERLAY_WS') && config.addWsParam) {
      useType.value = 'websocket'
      addOverlayWsParam()
    }
    else {
      useType.value = 'overlay'
    }
    check()
    setInterval(() => {
      check()
    }, 3000)
  })

  return { wsConnected, useType }
}
