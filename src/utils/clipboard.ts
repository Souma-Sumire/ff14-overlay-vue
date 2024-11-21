export function copyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      resolve()
    }
    catch (err) {
      reject(err)
    }
    finally {
      document.body.removeChild(textarea)
    }
  })
}
