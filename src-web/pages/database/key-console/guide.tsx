import { IconHelpCircle } from '@tabler/icons-react'
import { useTranslation } from '../../../i18n'
import { KvDatabaseType } from '../../../tauri'
import { IconButton, Popover, ScrollView } from '../../../ui'
import { useConnection } from '../hooks/use-store'

export const Guide = () => {
    return (
        <Popover
            side='top'
            trigger={
                <IconButton>
                    <IconHelpCircle size={16} strokeWidth={1.5} />
                </IconButton>
            }
        >
            <PopoverContent />
        </Popover>
    )
}

const PopoverContent = () => {
    const { t } = useTranslation()
    const type = useConnection().config.type as KvDatabaseType

    const helps = [
        {
            title: 'Redis Command',
            command: '<cmd> <arg> <arg>',
            examples: ['get name', 'set name Dataflare', 'info server', '...'],
            types: [KvDatabaseType.Redis]
        },
        {
            title: 'Search Keys',
            command: 'search <prefix> <filter_regex?>',
            examples: ['search users', 'search docs \\.md$'],
            types: [KvDatabaseType.CloudflareWorkersKv, KvDatabaseType.S3]
        },
        {
            title: 'Get Value',
            command: 'get <key>',
            examples: ['get docs/file.md', 'get "my file.txt"'],
            types: [KvDatabaseType.CloudflareWorkersKv, KvDatabaseType.S3]
        },
        {
            title: 'Set Value',
            command: 'set <key> <value>\nset <key> from <file_path>',
            examples: ["set docs/file.md 'new content'", 'set avatar.png from ~/Desktop/avatar.png'],
            types: [KvDatabaseType.CloudflareWorkersKv, KvDatabaseType.S3]
        },
        {
            title: 'Delete Key',
            command: 'delete <key>',
            examples: ['delete docs/file.md'],
            types: [KvDatabaseType.CloudflareWorkersKv, KvDatabaseType.S3]
        },
        {
            title: t('clearScreen'),
            command: 'clear',
            examples: [],
            types: [KvDatabaseType.Redis, KvDatabaseType.CloudflareWorkersKv, KvDatabaseType.S3]
        }
    ].filter((item) => item.types.includes(type))

    return (
        <ScrollView axis='y' viewportClassName='max-h-[calc(100vh-92px)]'>
            <div className='flex flex-col gap-4 px-4 py-3'>
                {helps.map((item, i) => {
                    return (
                        <div key={i}>
                            <h2 className='mb-2 text-xs font-medium text-secondary'>{item.title}</h2>
                            <p className='mb-1 whitespace-pre-wrap rounded-sm border border-separator px-2 font-jb text-xs leading-5 text-tertiary'>
                                {item.command}
                            </p>
                            {item.examples.map((item) => {
                                return (
                                    <p key={item} className='px-2 font-jb text-xs leading-5 text-tertiary'>
                                        {item}
                                    </p>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        </ScrollView>
    )
}
