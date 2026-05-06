import { IconDice2 } from '@tabler/icons-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from '../../../../i18n'
import { Button } from '../../../../ui'
import { Column } from '../../db/db-types'
import { Entry } from '../../hooks/use-store'

const DataGenerationComponent = lazy(() => import('./data-generation'))

interface Props {
    entry: Entry
    columns: Column[] | undefined
    onRefresh: () => void
}

export const DataGeneration = ({ columns, entry, onRefresh }: Props) => {
    const { t } = useTranslation()
    const [showPopup, setShowPopup] = useState(false)
    return (
        <>
            <Button
                title={t('dataGeneration')}
                disabled={columns === undefined}
                onClick={() => setShowPopup(true)}
            >
                <IconDice2 size={16} stroke={1.5} />
            </Button>
            {showPopup && columns !== undefined && (
                <Suspense>
                    <DataGenerationComponent
                        entry={entry}
                        columns={columns}
                        onRefresh={onRefresh}
                        onClose={() => setShowPopup(false)}
                    />
                </Suspense>
            )}
        </>
    )
}
