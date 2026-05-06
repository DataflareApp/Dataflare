import { t } from '../../i18n'
import { TlsConfig } from '../../tauri'
import { Button, DropdownMenu, DropdownMenuItem } from '../../ui'
import { readSelectedFile } from '../../utils/fs'
import { Row } from './from'

export const Tls = ({ config, onChange }: { config: TlsConfig; onChange: (config: TlsConfig) => void }) => {
    const onUpdate = <K extends keyof TlsConfig>(key: K, val: TlsConfig[K]) =>
        onChange({
            ...config,
            [key]: val
        })

    const onSelect = async (key: keyof TlsConfig) => {
        const content = await readSelectedFile('text')
        if (content === null) {
            return
        }
        onUpdate(key, content)
    }

    return (
        <Row label={t('cert')}>
            <SelectButton
                name={t('cert')}
                value={config.cert}
                onSelect={() => onSelect('cert')}
                onClear={() => onUpdate('cert', null)}
            />
            <SelectButton
                name={t('key')}
                value={config.key}
                onSelect={() => onSelect('key')}
                onClear={() => onUpdate('key', null)}
            />
            <SelectButton
                name={t('ca')}
                value={config.ca}
                onSelect={() => onSelect('ca')}
                onClear={() => onUpdate('ca', null)}
            />
        </Row>
    )
}

export const SelectButton = ({
    value,
    name,
    onSelect,
    onClear
}: {
    value: null | string
    name: string
    onSelect: () => void
    onClear: () => void
}) => {
    return value === null ? (
        <Button className='flex-1' onClick={onSelect}>
            {name}
        </Button>
    ) : (
        <DropdownMenu
            trigger={
                <Button primary className='flex-1'>
                    {name}
                </Button>
            }
        >
            <DropdownMenuItem onClick={onSelect}>{t('reselect')}</DropdownMenuItem>
            <DropdownMenuItem onClick={onClear}>{t('clear')}</DropdownMenuItem>
        </DropdownMenu>
    )
}
