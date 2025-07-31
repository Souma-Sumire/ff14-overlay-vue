import { callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'

function tts(text: string): Promise<void> {
  if (text === '') {
    return Promise.resolve(undefined)
  }
  return callOverlayHandler({
    call: 'cactbotSay',
    text,
  })
}

export { tts }
