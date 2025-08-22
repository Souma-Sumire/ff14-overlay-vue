function copyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      resolve()
    } catch (err) {
      reject(err)
    } finally {
      document.body.removeChild(textarea)
    }
  })
}

function copyImage(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const img = document.createElement('img')
    img.src = src

    img.onload = () => {
      const div = document.createElement('div')
      div.style.position = 'fixed'
      div.style.left = '-9999px'
      div.appendChild(img)
      document.body.appendChild(div)

      const range = document.createRange()
      range.selectNode(img)
      const selection = window.getSelection()
      if (!selection) {
        reject(new Error('无法获取 selection 对象'))
        return
      }
      selection.removeAllRanges()
      selection.addRange(range)

      const ok = document.execCommand('copy')
      document.body.removeChild(div)
      selection.removeAllRanges()

      if (ok) resolve()
      else reject(new Error('execCommand copy 失败'))
    }

    img.onerror = () => reject(new Error('图片加载失败'))
  })
}

export { copyImage, copyToClipboard }
