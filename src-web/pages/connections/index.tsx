import { shortcutCloseWindowAndShowConnections } from '../../hooks/use-shortcut'
import { render } from '../../utils/init'
import { Connections } from './connections'

shortcutCloseWindowAndShowConnections()

render(<Connections />)
