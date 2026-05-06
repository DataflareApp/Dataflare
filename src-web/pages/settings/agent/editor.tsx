import { AgentItem, defaultInstructions } from '.'
import { useTranslation } from '../../../i18n'
import { Textarea, TextInput } from '../../../ui'

interface EditorProps {
    agent: AgentItem
    onChange: (agent: AgentItem) => void
}

export const AgentEditor = ({ agent, onChange }: EditorProps) => {
    const { t } = useTranslation()
    return (
        <div className='flex h-full flex-col px-4 py-3'>
            <div className='mb-3'>
                <Label name={t('name')} />
                <TextInput
                    className='mt-1 w-full'
                    value={agent.name}
                    disabled={agent.builtIn}
                    onChange={(name) => onChange({ ...agent, name })}
                />
            </div>
            <div className='flex min-h-0 flex-1 flex-col'>
                <Label name='Instructions' />
                <Textarea
                    className='mt-1 min-h-0 w-full flex-1 resize-none px-2 py-1.5'
                    value={agent.instructions}
                    disabled={agent.builtIn}
                    onChange={(e) => onChange({ ...agent, instructions: e.target.value })}
                    placeholder={defaultInstructions}
                />
            </div>
        </div>
    )
}

const Label = ({ name }: { name: string }) => {
    return <span className='text-xs text-tertiary'>{name}</span>
}
