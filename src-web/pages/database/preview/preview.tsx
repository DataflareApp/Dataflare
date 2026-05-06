import { memo } from 'react'
import { ViewSqlButton, Popover, popoverSize } from '../../../ui'
import { SqlPreview } from '../sql-preview'

interface Props {
    sql: string
}

export const Preview = memo(({ sql }: Props) => {
    return (
        <Popover trigger={<ViewSqlButton />}>
            <SqlPreview className='px-4 py-2' format value={sql} style={popoverSize} />
        </Popover>
    )
})
