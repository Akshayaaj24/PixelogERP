// Shrink a photo/logo before saving (keeps the database small)
export function resizeImage(file, max = 320) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) return reject(new Error('Please choose an image'))
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      resolve(c.toDataURL('image/webp', 0.9))
    }
    img.onerror = () => reject(new Error('Could not read this image'))
    img.src = URL.createObjectURL(file)
  })
}

// File → base64 (for document upload)
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = () => reject(new Error('Could not read file'))
    r.readAsDataURL(file)
  })
}
