const blockedHosts = ['shimo.im', 'vfiles.gtimg.cn', 'pan.baidu.com']

export function checkReferrer() {
  const ref = document.referrer
  if (!ref) return

  const url = new URL(ref)
  const hit = blockedHosts.some((host) => url.hostname.includes(host))
  if (hit) {
    document.body.innerHTML = ''
    document.body.style.height = '100vh'
    document.body.style.display = 'flex'
    document.body.style.justifyContent = 'center'
    document.body.style.alignItems = 'center'
    document.body.style.color = '#d00'

    const content = document.createElement('div')
    content.innerHTML = `
        <h1>闲鱼小店死个妈！</h1>
        <p>本页面由 Souma 编写，永久免费，从未授权任何人进行售卖。</p>
        <p>如果你是付费获得的链接，请立刻退款并举报卖家。</p>
      `
    document.body.appendChild(content)

    throw new Error('Blocked by referrer check')
  }
}
