import {
    IconChevronLeft,
    IconChevronLeftPipe,
    IconChevronRight,
    IconChevronRightPipe
} from '@tabler/icons-react'
import { useState } from 'react'
import { useTranslation } from '../../../i18n'
import { Button, IconButton, TextInput, Popover, Select } from '../../../ui'
import { keyboardTitleChars, KeyModifier } from '../../../utils/keyboard-char'
import { parseIntNumber } from '../../../utils/number'

export interface PaginationProps {
    page: number
    limit: number
    rowCount: number | undefined
    onChange: (page: number, limit: number) => void
}

export const Pagination = ({ page, limit, rowCount, onChange }: PaginationProps) => {
    const [open, setOpen] = useState(false)
    const { t, tf, numberUtil } = useTranslation()

    const range = tf('rowsCount', numberUtil.formatRange((page - 1) * limit + 1, page * limit))
    const lastPage = Math.ceil((rowCount ?? 0) / limit)

    const firstTitle = keyboardTitleChars(t('firstPage'), [KeyModifier.Shift, KeyModifier.Meta, '←'])
    const lastTitle = keyboardTitleChars(t('lastPage'), [KeyModifier.Shift, KeyModifier.Meta, '→'])
    const prevTitle = keyboardTitleChars(t('previousPage'), [KeyModifier.Meta, '←'])
    const nextTitle = keyboardTitleChars(t('nextPage'), [KeyModifier.Meta, '→'])

    return (
        <div className='flex items-center'>
            <IconButton title={firstTitle} className='!py-px' onClick={() => onChange(1, limit)}>
                <IconChevronLeftPipe size={18} stroke={1.5} />
            </IconButton>
            <IconButton
                title={prevTitle}
                className='!py-px'
                onClick={() => {
                    page > 1 && onChange(page - 1, limit)
                }}
            >
                <IconChevronLeft size={18} stroke={1.5} />
            </IconButton>
            <Popover
                className='grid grid-cols-[auto_140px] gap-3 px-4 py-3'
                trigger={<IconButton className='whitespace-nowrap tabular-nums'>{range}</IconButton>}
                sideOffset={3}
                open={open}
                onOpenChange={setOpen}
            >
                <PopoverContent
                    page={page}
                    limit={limit}
                    onChange={(page, limit) => {
                        onChange(page, limit)
                        setOpen(false)
                    }}
                />
            </Popover>
            <IconButton title={nextTitle} className='!py-px' onClick={() => onChange(page + 1, limit)}>
                <IconChevronRight size={18} stroke={1.5} />
            </IconButton>
            <IconButton
                title={lastTitle}
                className='!py-px'
                onClick={() => {
                    lastPage > 0 && onChange(lastPage, limit)
                }}
            >
                <IconChevronRightPipe size={18} stroke={1.5} />
            </IconButton>
        </div>
    )
}

const itemsPerPage = [10, 50, 100, 500, 1000, 5000, 10000]

const PopoverContent = ({ page, limit, onChange }: Omit<PaginationProps, 'rowCount'>) => {
    const { t, tf, numberUtil } = useTranslation()
    const [inputPage, setInputPage] = useState(page.toString())
    const [inputLimit, setInputLimit] = useState(limit)

    const limitSelectOptions = itemsPerPage.map((item) => {
        return {
            name: tf('rowsCount', numberUtil.format(item)),
            value: item.toString()
        }
    })

    const p = parseInt(inputPage)
    const range = Number.isNaN(p) || p < 1 ? null : [(p - 1) * inputLimit + 1, p * inputLimit]
    const rangeText = range === null ? null : tf('rowsCount', numberUtil.formatRange(range[0], range[1]))

    return (
        <>
            <label className='text-xs leading-7 text-tertiary'>{t('limit')}</label>
            <Select
                value={inputLimit.toString()}
                options={limitSelectOptions}
                onChange={(val) => setInputLimit(Number(val))}
            />

            <label className='text-xs leading-7 text-tertiary'>{t('page')}</label>
            <TextInput autoFocus value={inputPage} onChange={setInputPage} />

            <label className='text-xs leading-7 text-tertiary'>{t('rows')}</label>
            <p className='flex items-center pl-2 text-sm leading-4 text-secondary'>{rangeText}</p>

            <Button
                className='col-span-2'
                onClick={() => {
                    onChange(parseIntNumber(inputPage, Number.MAX_SAFE_INTEGER, 1, 1), inputLimit)
                }}
            >
                {t('ok')}
            </Button>
        </>
    )
}
