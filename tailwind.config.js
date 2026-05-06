/** @type {import('tailwindcss').Config} */
import { fontFamily } from 'tailwindcss/defaultTheme'

export default {
    content: ['./src-web/*.html', './src-web/**/*.tsx'],
    theme: {
        extend: {
            fontFamily: {
                sans:
                    // On Linux, make `sans-serif` take precedence over `system-ui` to keep text consistent with the desktop environment
                    process.platform === 'linux'
                        ? ['sans-serif', 'system-ui', '"Noto Color Emoji"']
                        : fontFamily.sans,
                jb: ['JetBrainsMono']
            },
            colors: {
                theme: '#0384EC',
                // Background color
                main: 'rgb(var(--color-main) / <alpha-value>)',
                // Text color
                primary: 'var(--color-primary)',
                secondary: 'var(--color-secondary)',
                tertiary: 'var(--color-tertiary)',
                quarternary: 'var(--color-quarternary)',
                separator: 'var(--color-separator)'
            },
            boxShadow: {
                dialog: '0 12px 32px 4px rgba(0, 0, 0, 0.2)'
            },
            animation: {
                overlayIn: 'overlayIn 0.3s',
                alertIn: 'alertIn 0.2s ease-out forwards',
                dialogIn: 'dialogIn 0.2s ease-out forwards',
                popoverIn: 'popoverIn 0.2s ease-out forwards',
                hoverCardIn: 'hoverCardIn 0.2s ease-out forwards',
                dropdownIn: 'dropdownIn 0.2s ease-out forwards',
                commitCardIn: 'commitCardIn 0.3s ease-out forwards'
            },
            keyframes: {
                overlayIn: {
                    from: { opacity: 0 },
                    to: { opacity: 1 }
                },
                alertIn: {
                    '0%': { transform: 'translate(-50%, -50%) scale(0.96)', opacity: 0 },
                    '80%': { transform: 'translate(-50%, -50%) scale(1.02)' },
                    '100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
                },
                dialogIn: {
                    from: { transform: 'translate(-50%, -50%) scale(0.97)', opacity: 0 },
                    to: { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
                },
                popoverIn: {
                    from: {
                        transformOrigin: 'var(--radix-popover-content-transform-origin)',
                        transform: 'scale(0.96)',
                        opacity: 0
                    },
                    to: {
                        transformOrigin: 'var(--radix-popover-content-transform-origin)',
                        transform: 'scale(1)',
                        opacity: 1
                    }
                },
                hoverCardIn: {
                    from: {
                        transformOrigin: 'var(--radix-hover-card-content-transform-origin)',
                        transform: 'scale(0.96)',
                        opacity: 0
                    },
                    to: {
                        transformOrigin: 'var(--radix-hover-card-content-transform-origin)',
                        transform: 'scale(1)',
                        opacity: 1
                    }
                },
                dropdownIn: {
                    from: {
                        transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)',
                        transform: 'scale(0.96)',
                        opacity: 0
                    },
                    to: {
                        transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)',
                        transform: 'scale(1)',
                        opacity: 1
                    }
                },
                commitCardIn: {
                    '0%': {
                        transform: 'translate(-50%, 30%) scale(0.96)',
                        opacity: 0
                    },
                    '30%': {
                        transform: 'translate(-50%, 10%) scale(1.04)'
                    },
                    '100%': {
                        transform: 'translate(-50%, 0) scale(1)',
                        opacity: 1
                    }
                }
            }
        }
    },
    plugins: []
}
