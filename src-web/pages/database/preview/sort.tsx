import {
    IconArrowsSort,
    IconChevronDown,
    IconChevronUp,
    IconSortAscending,
    IconSortDescending
} from '@tabler/icons-react'
import { useFuzzySearch } from '../../../hooks/use-fuzzy-search'
import { useSearch } from '../../../hooks/use-search'
import { useTranslation } from '../../../i18n'
import { Button, Message, Popover, popoverSize, ScrollView, SearchInput } from '../../../ui'
import { Column } from '../db/db'

export interface Sort {
    name: string
    type: SortType
}

export const enum SortType {
    Ascending,
    Descending
}

interface Props {
    columns: Column[] | undefined
    sort: Sort | null
    onChange: (sort: Sort | null) => void
}

export const ColumnsSort = ({ columns, sort, onChange }: Props) => {
    const { t } = useTranslation()

    const { search, setSearch, displaySearch } = useSearch('', 200)
    const filteredColumns = useFuzzySearch(columns, search, (item) => {
        return item.name + '\n' + item.datatype
    })

    const trigger = (
        <Button primary={sort !== null} disabled={columns === undefined} title={t('sort')}>
            {sort !== null ? (
                sort.type === SortType.Ascending ? (
                    <IconSortAscending size={16} stroke={1.5} />
                ) : (
                    <IconSortDescending size={16} stroke={1.5} />
                )
            ) : (
                <IconArrowsSort size={16} stroke={1.5} />
            )}
        </Button>
    )

    return (
        <Popover trigger={trigger}>
            <div className='flex px-4 pt-2' style={{ minWidth: 234 }}>
                <SearchInput className='w-0 flex-1' value={displaySearch} onChange={setSearch} />
            </div>

            {columns !== undefined && search !== '' && filteredColumns.length === 0 && (
                <div className='h-20'>
                    <Message text={t('noSearchResult')} />
                </div>
            )}

            {columns !== undefined && filteredColumns.length > 0 && (
                <SortContent filteredColumns={filteredColumns} sort={sort} onChange={onChange} />
            )}
        </Popover>
    )
}

const SortContent = ({
    filteredColumns,
    sort,
    onChange
}: {
    filteredColumns: Column[]
    sort: Sort | null
    onChange: (sort: Sort | null) => void
}) => {
    return (
        <ScrollView
            axis='y'
            className='mt-1'
            viewportClassName='p-1'
            style={{
                maxHeight: `calc(${popoverSize.maxHeight} - 40px)`
            }}
        >
            {filteredColumns.map((item) => {
                const isCurrent = item.name === sort?.name
                return (
                    <div
                        key={item.name}
                        className='flex h-7 items-center gap-2 rounded-sm px-4 hover:bg-neutral-200 dark:hover:bg-zinc-800/80'
                        onClick={() => {
                            if (!isCurrent || sort?.type === undefined) {
                                return onChange({
                                    name: item.name,
                                    type: SortType.Ascending
                                })
                            }
                            if (sort.type === SortType.Ascending) {
                                return onChange({
                                    name: item.name,
                                    type: SortType.Descending
                                })
                            }
                            return onChange(null)
                        }}
                    >
                        <SortIcon type={isCurrent ? sort.type : null} />
                        <span className='max-w-[140px] truncate text-sm text-primary'>{item.name}</span>
                        <span className='text-xs text-quarternary'>{item.datatype}</span>
                    </div>
                )
            })}
        </ScrollView>
    )
}

const SortIcon = ({ type }: { type: SortType | null }) => {
    if (type === null) {
        return <div className='w-4'></div>
    }
    switch (type) {
        case SortType.Ascending: {
            return <IconChevronUp size={16} stroke={1.8} className='text-primary' />
        }
        case SortType.Descending: {
            return <IconChevronDown size={16} stroke={1.8} className='text-primary' />
        }
    }
}
