import { IconCheck, IconColumns3, IconDots } from '@tabler/icons-react'
import { useFuzzySearch } from '../../../hooks/use-fuzzy-search'
import { useSearch } from '../../../hooks/use-search'
import { useTranslation } from '../../../i18n'
import {
    Button,
    DropdownMenu,
    DropdownMenuItem,
    IconButton,
    Message,
    Popover,
    popoverSize,
    ScrollView,
    SearchInput
} from '../../../ui'
import { Column } from '../db/db'

interface Props {
    columns: Column[] | undefined
    selected: string[] | null
    onChange: (columns: string[] | null) => void
}

export const ColumnsFilter = ({ selected, columns, onChange }: Props) => {
    const { t } = useTranslation()

    const { search, setSearch, displaySearch } = useSearch('', 200)
    const filteredColumns = useFuzzySearch(columns, search, (item) => {
        return item.name + '\n' + item.datatype
    })

    const trigger = (
        <Button primary={selected !== null} disabled={columns === undefined} title={t('selectColumn')}>
            <IconColumns3 size={16} stroke={1.5} />
        </Button>
    )

    return (
        <Popover trigger={trigger}>
            <div className='flex gap-1 pl-4 pr-2 pt-2' style={{ minWidth: 234 }}>
                <SearchInput className='w-0 flex-1' value={displaySearch} onChange={setSearch} />
                <DropdownMenu
                    trigger={
                        <IconButton>
                            <IconDots size={16} strokeWidth={1.5} />
                        </IconButton>
                    }
                >
                    <DropdownMenuItem onClick={() => onChange(null)}>{t('selectAll')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChange([])}>{t('deselectAll')}</DropdownMenuItem>
                </DropdownMenu>
            </div>

            {columns !== undefined && search !== '' && filteredColumns.length === 0 && (
                <div className='h-20'>
                    <Message text={t('noSearchResult')} />
                </div>
            )}

            {columns !== undefined && filteredColumns.length > 0 && (
                <ColumnsContent
                    columns={columns}
                    filteredColumns={filteredColumns}
                    selected={selected}
                    onChange={onChange}
                />
            )}
        </Popover>
    )
}

const ColumnsContent = ({
    columns,
    filteredColumns,
    selected,
    onChange
}: {
    columns: Column[]
    filteredColumns: Column[]
} & Props) => {
    const onToggleSelect = (isSelect: boolean, columnName: string) => {
        const cols = columns.map((item) => item.name)
        // Currently in select-all state, need to exclude the specified column from all columns
        if (selected === null) {
            const i = columns.findIndex((item) => item.name === columnName)
            cols.splice(i, 1)
            return onChange(cols)
        }
        // Exclude specified columns from the selected ones
        if (isSelect) {
            const newSelected = selected.filter((col) => col !== columnName)
            return onChange(newSelected)
        }
        // Maintain order
        const newSelected = cols.filter((col) => {
            return selected.includes(col) || col === columnName
        })
        const allSelected = newSelected.length === columns.length
        onChange(allSelected ? null : newSelected)
    }

    return (
        <ScrollView
            axis='y'
            viewportClassName='pt-1 mt-1 px-1 pb-1'
            style={{
                maxHeight: `calc(${popoverSize.maxHeight} - 40px)`
            }}
        >
            {filteredColumns.map((item) => {
                const isSelect = selected === null || selected.includes(item.name)
                return (
                    <div
                        className='flex h-7 items-center rounded-sm px-4 hover:bg-neutral-200 dark:hover:bg-zinc-800/80'
                        key={item.name}
                        title={`${item.name} [${item.datatype}]`}
                        onClick={() => onToggleSelect(isSelect, item.name)}
                    >
                        {isSelect ? (
                            <IconCheck size={16} className='mr-2 text-primary' />
                        ) : (
                            <div className='mr-2 w-4'></div>
                        )}
                        <span className='max-w-[140px] truncate text-sm text-primary'>{item.name}</span>
                        <span className='ml-2 text-xs text-quarternary'>{item.datatype}</span>
                    </div>
                )
            })}
        </ScrollView>
    )
}
