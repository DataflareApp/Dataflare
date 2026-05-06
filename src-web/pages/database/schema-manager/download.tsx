import { IconCamera, IconCheck, IconCopy, IconMoonStars, IconSunHigh } from '@tabler/icons-react'
import { Edge, Node } from '@xyflow/react'
import { useMemo, useState } from 'react'
import useSWRMutation from 'swr/mutation'
import { useSuccess } from '../../../hooks/use-success'
import { t } from '../../../i18n'
import { Button, SelectButton, Popover } from '../../../ui'
import { useConnection } from '../hooks/use-store'
import { calcImageSize, Color, copySchemaImage, downloadSchemaImage } from './draw'

interface DownloadProps {
    disabled: boolean
    nodes: Node[] | undefined
    edges: Edge[] | undefined
    schema: string
}

export const DownloadButton = (props: DownloadProps) => {
    return (
        <Popover
            trigger={
                <Button disabled={props.disabled}>
                    <IconCamera size={16} stroke={1.5} />
                </Button>
            }
        >
            <Content nodes={props.nodes} edges={props.edges} schema={props.schema} />
        </Popover>
    )
}

const Content = ({ nodes, edges, schema }: Omit<DownloadProps, 'disabled'>) => {
    const connection = useConnection()
    const [color, setColor] = useState(Color.Light)
    const [scale, setScale] = useState(2)

    const { width, height } = useMemo(() => {
        return calcImageSize(scale, nodes ?? [])
    }, [scale, nodes])

    const [downloadSuccess, setDownloadSuccess] = useSuccess()
    const [copySuccess, setCopySuccess] = useSuccess()

    const { isMutating: downloadIsMutating, trigger: downloadTrigger } = useSWRMutation(
        'download-image',
        () => {
            const name = connection.name + '-' + schema
            return downloadSchemaImage(nodes ?? [], edges ?? [], color, scale, name)
        }
    )
    const { isMutating: copyIsMutating, trigger: copyTrigger } = useSWRMutation('copy-image', () => {
        return copySchemaImage(nodes ?? [], edges ?? [], color, scale)
    })
    const onDownload = async () => {
        if (downloadSuccess) return
        const status = await downloadTrigger()
        if (status) {
            setDownloadSuccess()
        }
    }
    const onCopy = async () => {
        if (copySuccess) return
        const status = await copyTrigger()
        if (status) {
            setCopySuccess()
        }
    }

    return (
        <div className='grid grid-cols-[auto_200px] gap-3 p-4 text-xs text-tertiary'>
            <label className='text-right leading-7'>{t('color')}</label>
            <div className='grid grid-cols-3 gap-2'>
                <SelectButton selected={color === Color.Light} onClick={() => setColor(Color.Light)}>
                    <IconSunHigh size={16} stroke={1.7} />
                </SelectButton>
                <SelectButton selected={color === Color.Dark} onClick={() => setColor(Color.Dark)}>
                    <IconMoonStars size={16} stroke={1.6} />
                </SelectButton>
            </div>
            <label className='text-right leading-7'>{t('size')}</label>
            <div className='grid grid-cols-4 gap-2'>
                {[1, 2, 4, 6].map((val) => {
                    return (
                        <SelectButton key={val} selected={scale === val} onClick={() => setScale(val)}>
                            {val}×
                        </SelectButton>
                    )
                })}
            </div>
            <label className='col-start-2'>
                {width} × {height} px
            </label>
            <div className='col-start-2 flex gap-2'>
                <Button className='flex-1' autoFocus loading={downloadIsMutating} onClick={onDownload}>
                    {downloadSuccess ? <IconCheck size={16} stroke={1.5} /> : t('export')}
                </Button>
                <Button loading={copyIsMutating} onClick={onCopy}>
                    {copySuccess ? <IconCheck size={16} stroke={1.5} /> : <IconCopy size={16} stroke={1.5} />}
                </Button>
            </div>
        </div>
    )
}
