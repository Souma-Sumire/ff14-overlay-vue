import { ElMessageBox } from 'element-plus'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
  } = { allowClose: false, addWsParam: true },
) {
  const { t } = useI18n()
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

      const message = t('websocket.disconnectMsg', { actWS })
      const title = config.allowClose
        ? t('websocket.disconnectTitleCloseable')
        : t('websocket.disconnectTitleRequired')

      ElMessageBox.alert(message, title, {
        dangerouslyUseHTMLString: true,
        closeOnClickModal: false,
        showClose: false,
        closeOnPressEscape: false,
        closeOnHashChange: false,
        showCancelButton: config.allowClose,
        showConfirmButton: false,
        cancelButtonText: t('websocket.ignoreWarningBtn'),
        buttonSize: 'small',
      }).catch(() => {
        userIgnoredWarning.value = true
        if (timer)
          clearInterval(timer)
      })
    }
  }

  onMounted(() => {
    if (isIE()) {
      ElMessageBox.alert(
        t('websocket.ieBrowserWarning'),
        t('websocket.ieBrowserTitle'),
        {
          type: 'error',
          showConfirmButton: false,
          showClose: false,
        },
      )
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
      addOverlayWsParam()
    }
    check()
  })

  return { wsConnected, useType }
}
