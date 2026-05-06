import { IconChevronDown } from '@tabler/icons-react'
import { homeDir } from '@tauri-apps/api/path'
import { t } from '../../i18n'
import { ProxyConfig, ProxyConfigType, SshAuth, SshAuthType } from '../../tauri'
import { DropdownMenu, DropdownMenuItem, IconButton, Select, Textarea } from '../../ui'
import { readSelectedFile } from '../../utils/fs'
import { isMacOS, isWindows } from '../../utils/os'
import { Addr, BooleanSelect, Item, Row } from './from'
import { SelectButton } from './tls'

const defaultProxyConfig = (): ProxyConfig => {
    return {
        type: ProxyConfigType.SSH,
        options: {
            host: '',
            port: null,
            user: '',
            auth: defaultSshAuthConfig(SshAuthType.Key)
        }
    }
}

const defaultSshAuthConfig = (type: SshAuthType): SshAuth => {
    switch (type) {
        case SshAuthType.Password: {
            return {
                type: SshAuthType.Password,
                options: {
                    password: ''
                }
            }
        }
        case SshAuthType.Key: {
            return {
                type: SshAuthType.Key,
                options: {
                    key: '',
                    password: null
                }
            }
        }
        case SshAuthType.Agent: {
            return {
                type: SshAuthType.Agent,
                options: {
                    agent_endpoint: null
                }
            }
        }
    }
}

interface Props {
    proxy: ProxyConfig | null
    onChange: (proxy: ProxyConfig | null) => void
}

export const Proxy = ({ proxy, onChange }: Props) => {
    const onUpdate = <K extends keyof ProxyConfig['options']>(key: K, val: ProxyConfig['options'][K]) => {
        onChange({
            ...proxy!,
            options: {
                ...proxy!.options,
                [key]: val
            }
        })
    }

    return (
        <>
            <Row label={t('proxy')}>
                <BooleanSelect
                    value={proxy === null}
                    trueText={t('proxyDisabled')}
                    falseText='SSH'
                    onChange={(val) => onChange(val ? null : defaultProxyConfig())}
                />
            </Row>
            {proxy && (
                <>
                    <Addr
                        host={proxy.options.host}
                        hostPlaceholder=''
                        port={proxy.options.port}
                        portPlaceholder='22'
                        onChangeHost={(val) => onUpdate('host', val)}
                        onChangePort={(val) => onUpdate('port', val)}
                    />
                    <Item
                        label={t('user')}
                        value={proxy.options.user}
                        onChange={(val) => onUpdate('user', val)}
                    />
                    <SshAuthInput auth={proxy.options.auth} onChange={(auth) => onUpdate('auth', auth)} />
                </>
            )}
        </>
    )
}

const SshAuthInput = ({ auth, onChange }: { auth: SshAuth; onChange: (auth: SshAuth) => void }) => {
    return (
        <>
            <Row label={t('auth')}>
                <Select
                    className='w-full'
                    options={[
                        { value: SshAuthType.Key, name: t('key') },
                        { value: SshAuthType.Password, name: t('password') },
                        { value: SshAuthType.Agent, name: 'SSH Agent' }
                    ]}
                    value={auth.type}
                    onChange={(val) => onChange(defaultSshAuthConfig(val as SshAuthType))}
                />
            </Row>
            {auth.type === SshAuthType.Password && (
                <Item
                    label={t('password')}
                    type='password'
                    value={auth.options.password}
                    onChange={(val) =>
                        onChange({
                            ...auth,
                            options: {
                                password: val
                            }
                        })
                    }
                />
            )}
            {auth.type === SshAuthType.Key && (
                <>
                    <Row label={t('privateKey')}>
                        <SelectButton
                            value={auth.options.key === '' ? null : ''}
                            name={auth.options.key === '' ? t('importPrivateKey') : t('privateKey')}
                            onSelect={async () => {
                                const content = await readSelectedFile('text')
                                if (content !== null) {
                                    onChange({
                                        ...auth,
                                        options: {
                                            ...auth.options,
                                            key: content
                                        }
                                    })
                                }
                            }}
                            onClear={() => {
                                onChange({
                                    ...auth,
                                    options: {
                                        ...auth.options,
                                        key: ''
                                    }
                                })
                            }}
                        />
                    </Row>
                    <Item
                        label={t('password')}
                        type='password'
                        value={auth.options.password ?? ''}
                        onChange={(val) => {
                            onChange({
                                ...auth,
                                options: {
                                    ...auth.options,
                                    password: val === '' ? null : val
                                }
                            })
                        }}
                    />
                </>
            )}
            {auth.type === SshAuthType.Agent && (
                <>
                    <Row label=''>
                        <div className='relative grow'>
                            <Textarea
                                className='h-16 w-full resize-none break-all py-1 pr-9'
                                placeholder={endpointPlaceholder()}
                                value={auth.options.agent_endpoint ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value
                                    onChange({
                                        ...auth,
                                        options: {
                                            agent_endpoint: val === '' ? null : val
                                        }
                                    })
                                }}
                            />
                            <OnePasswordSuggestions
                                onChange={(agent_endpoint) => {
                                    onChange({
                                        ...auth,
                                        options: {
                                            agent_endpoint
                                        }
                                    })
                                }}
                            />
                            {!isWindows && (
                                <p className='mt-2 text-xs text-tertiary'>Default: $SSH_AUTH_SOCK</p>
                            )}
                        </div>
                    </Row>
                </>
            )}
        </>
    )
}

const OnePasswordSuggestions = ({ onChange }: { onChange: (value: string) => void }) => {
    return (
        <DropdownMenu
            trigger={
                <IconButton title={t('showSuggestions')} className='absolute right-0 top-0 h-7'>
                    <IconChevronDown size={16} />
                </IconButton>
            }
        >
            <DropdownMenuItem onClick={() => onePasswordEndpoint().then(onChange)}>
                1Password
            </DropdownMenuItem>
        </DropdownMenu>
    )
}

const endpointPlaceholder = () => {
    if (isWindows) {
        return '\\\\.\\pipe\\openssh-ssh-agent'
    }
    if (isMacOS) {
        return '/Users/user/.ssh/agent.sock'
    }
    // Linux
    return '/home/user/.ssh/agent.sock'
}

const onePasswordEndpoint = async () => {
    if (isWindows) {
        return '\\\\.\\pipe\\openssh-ssh-agent'
    }
    const home = await homeDir()
    if (isMacOS) {
        return `${home}/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock`
    }
    // Linux
    return `${home}/.1password/agent.sock`
}
