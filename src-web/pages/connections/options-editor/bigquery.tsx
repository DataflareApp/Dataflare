import { IconHelp } from '@tabler/icons-react'
import { t } from '../../../i18n'
import { BigQueryAuthType, BigQueryConfig } from '../../../tauri'
import { HoverCardTooltip, TextInput } from '../../../ui'
import { readSelectedFile } from '../../../utils/fs'
import { ConnectionEditorOptions } from '../connections'
import { Item, Readonly, Row } from '../from'
import { useOptions } from '../hooks'
import { ConnectionTab } from '../tabs'
import { SelectButton } from '../tls'

export const BigQueryConnection = ({ data, onChange }: ConnectionEditorOptions<BigQueryConfig>) => {
    const { name, options, setName, setOpt } = useOptions(data, onChange)

    const onSelectJsonKey = async () => {
        setOpt('auth', {
            type: BigQueryAuthType.JsonKey,
            options: {
                content: await readSelectedFile('text')
            }
        })
    }

    const onClearJsonKey = () => {
        setOpt('auth', {
            type: BigQueryAuthType.JsonKey,
            options: {
                content: null
            }
        })
    }

    const general = (
        <>
            <Item label={t('name')} value={name} onChange={(val) => setName(val)} />
            <Row label='Project ID'>
                <div className='flex flex-1 grow items-center gap-2'>
                    <TextInput
                        className='grow'
                        placeholder='Project ID'
                        value={options.project_id ?? ''}
                        onChange={(val) => setOpt('project_id', val === '' ? null : val)}
                    />
                    <HoverCardTooltip
                        style={{
                            maxWidth: 320
                        }}
                        text="Optional. Generally not required unless your JSON Key file does not contain a 'project_id' field."
                        trigger={
                            <IconHelp size={16} stroke={1.5} className='text-tertiary hover:text-primary' />
                        }
                    />
                </div>
            </Row>
            <Row label='Dataset'>
                <div className='flex flex-1 grow items-center gap-2'>
                    <TextInput
                        className='grow'
                        placeholder='Dataset'
                        value={options.dataset ?? ''}
                        onChange={(val) => setOpt('dataset', val === '' ? null : val)}
                    />
                    <HoverCardTooltip
                        style={{
                            maxWidth: 320
                        }}
                        text="Optional. Specifies the default 'dataset' to assume for any unqualified table names in the query. If not set, all table names in the query string must be qualified in the format 'dataset.table'."
                        trigger={
                            <IconHelp size={16} stroke={1.5} className='text-tertiary hover:text-primary' />
                        }
                    />
                </div>
            </Row>
            {options.auth.type === BigQueryAuthType.JsonKey && (
                <>
                    <Row label={'JSON Key'}>
                        <SelectButton
                            name={`JSON Key file`}
                            value={options.auth.options.content || null}
                            onSelect={onSelectJsonKey}
                            onClear={onClearJsonKey}
                        />
                    </Row>
                    <Row label=''>
                        <p className='-mt-1 text-xs text-tertiary'>{`IAM & Admin -> Service Account's JSON Key file`}</p>
                    </Row>
                </>
            )}
        </>
    )

    const security = (
        <>
            <Readonly
                secure={false}
                readonly={options.readonly}
                onChange={(val) => setOpt('readonly', val)}
            />
        </>
    )

    return <ConnectionTab general={general} security={security} />
}
