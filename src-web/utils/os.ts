export const isMacOS = navigator.userAgent.includes('Mac OS X')
export const isLinux = navigator.userAgent.includes('Linux')
export const isWindows = !isMacOS && !isLinux
