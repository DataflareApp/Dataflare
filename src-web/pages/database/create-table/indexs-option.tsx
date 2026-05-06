import { useTranslation } from '../../../i18n'
import { IconButton, Checkbox, Textarea } from '../../../ui'
import type { TableIndexOption } from '../db/db'
import { Label, Popover } from './popover'

interface Props {
    option: TableIndexOption
    onChange: (newOption: TableIndexOption) => void
}

export const IndexOption = ({ option, onChange }: Props) => {
    const { t } = useTranslation()
    const trigger = (
        <IconButton title={t('indexOption')} className='flex h-5 items-center border border-sky-500'>
            <span className='whitespace-nowrap text-xs text-sky-500'>
                {option.unique ? 'Unique Index' : 'Index'}
            </span>
        </IconButton>
    )

    return (
        <Popover title={t('indexOption')} trigger={trigger}>
            <Label text='Unique' />
            <div className='flex h-7 items-center'>
                <Checkbox checked={option.unique} onChange={(val) => onChange({ ...option, unique: val })} />
            </div>
            <Label text='Condition' />
            <Textarea
                className='h-24 resize-none'
                value={option.condition ?? ''}
                onChange={(e) =>
                    onChange({
                        ...option,
                        condition: e.target.value === '' ? null : e.target.value
                    })
                }
            />
        </Popover>
    )
}
