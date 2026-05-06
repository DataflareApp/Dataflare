import { TableCreate } from '../create-table'
import { Dashboard } from '../dashboard'
import { TableEdit } from '../edit-table'
import { ExtensionManager } from '../extension-manager'
import { FunctionManager } from '../function-manager'
import { TabType, useTabsStore } from '../hooks/use-store'
import { KeyConsole } from '../key-console'
import { KeyDetail } from '../key-detail'
import { TablePreview } from '../preview'
import { TableQuery } from '../query'
import { SchemaManager } from '../schema-manager'
import { TriggerManager } from '../trigger-manager'
import { getTabId } from '../utils/tab'
import { Tabs } from './tabs'
import { Welcome } from './welcome'

export const Right = () => {
    const tabsData = useTabsStore((state) => state.tabsData)
    const activeTab = useTabsStore((state) => state.activeTab)

    // Show welcome screen
    if (activeTab === null) {
        return <Welcome size='large' />
    }

    const activeTabId = getTabId(activeTab)
    // Show main right panel
    return (
        <>
            <Tabs />
            {tabsData.map((item): JSX.Element => {
                // Render all opened tabs but only show the currently selected tab content
                // This way each component maintains its own state instead of maintaining one large data state
                const id = getTabId(item)
                const hiddenContent = activeTabId !== id
                switch (item.type) {
                    case TabType.Preview: {
                        return (
                            <TablePreview
                                key={id}
                                hidden={hiddenContent}
                                entry={item.entry}
                                type={item.tableType}
                            />
                        )
                    }
                    case TabType.Query: {
                        return <TableQuery key={id} hidden={hiddenContent} queryId={item.query.qid} />
                    }
                    case TabType.Create: {
                        return (
                            <TableCreate key={id} hidden={hiddenContent} defaultSchema={item.defaultSchema} />
                        )
                    }
                    case TabType.Edit: {
                        return <TableEdit key={id} hidden={hiddenContent} entry={item.entry} />
                    }
                    case TabType.Dashboard: {
                        return <Dashboard key={id} hidden={hiddenContent} />
                    }
                    case TabType.SchemaManager: {
                        return (
                            <SchemaManager
                                key={id}
                                hidden={hiddenContent}
                                defaultSchema={item.defaultSchema}
                            />
                        )
                    }
                    case TabType.FunctionManager: {
                        return <FunctionManager key={id} hidden={hiddenContent} />
                    }
                    case TabType.TriggerManager: {
                        return <TriggerManager key={id} hidden={hiddenContent} />
                    }
                    case TabType.ExtensionManager: {
                        return <ExtensionManager key={id} hidden={hiddenContent} />
                    }
                    case TabType.KeyDetail: {
                        return <KeyDetail key={id} entry={item.entry} hidden={hiddenContent} />
                    }
                    case TabType.KeyConsole: {
                        return <KeyConsole key={id} hidden={hiddenContent} />
                    }
                }
            })}
        </>
    )
}
