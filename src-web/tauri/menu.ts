import { Menu, MenuOptions } from '@tauri-apps/api/menu'

type ContextMenuItem = {
    label: string
    separator?: boolean
    hidden?: boolean
    disabled?: boolean
    onClick: () => void
}

type ContextSubmenuItem = {
    label: string
    separator?: boolean
    disabled?: boolean
    subitems: MenuItem[]
}

type MenuItem = ContextMenuItem | ContextSubmenuItem

export const showContextMenu = async (menuItems: MenuItem[], onClose?: () => void) => {
    let menu = await Menu.new({
        items: convertItems(menuItems)
    })
    await menu.popup()
    onClose && onClose()
}

const convertItems = (menuItems: MenuItem[]): NonNullable<MenuOptions['items']> => {
    const pluginMenuItems: MenuOptions['items'] = []
    for (const m of menuItems) {
        const item = m as Partial<ContextMenuItem> & Partial<ContextSubmenuItem>
        // Hidden MenuItem
        if (item.hidden === true) {
            continue
        }
        // Needs to be separated from the items above
        if (item.separator) {
            pluginMenuItems.push({ item: 'Separator' })
        }
        // MenuItem
        const enabled = item.disabled === true ? false : true
        if (item.onClick !== undefined) {
            pluginMenuItems.push({
                text: item.label!,
                enabled,
                action: enabled ? item.onClick : undefined
            })
            continue
        }
        // SubmenuItem
        pluginMenuItems.push({
            text: item.label!,
            enabled,
            items: convertItems(item.subitems!)
        })
    }
    return pluginMenuItems
}
