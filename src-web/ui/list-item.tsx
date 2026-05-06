export interface ListItemProps {
    top: number
    selected: boolean
    highlight: boolean
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void
    icon: React.ReactNode
    label: string
}

export const ListItem = ({
    top,
    selected,
    highlight,
    onClick,
    onContextMenu,
    icon,
    label
}: ListItemProps) => {
    return (
        <div
            style={{ top }}
            data-highlight={highlight || undefined}
            data-selected={selected || undefined}
            className='absolute inset-x-4 flex h-7 items-center gap-1 rounded px-2 outline-1 -outline-offset-1 outline-theme data-[selected]:bg-neutral-300/60 data-[highlight]:outline dark:data-[selected]:bg-zinc-800/60'
            onClick={onClick}
            onContextMenu={onContextMenu}
            title={label}
        >
            {icon}
            <span className='grow truncate text-sm text-secondary'>{label}</span>
        </div>
    )
}
