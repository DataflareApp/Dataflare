import { shortcutCloseWindowAndShowConnections } from '../../hooks/use-shortcut'
import { render } from '../../utils/init'
import { Settings } from './settings'

shortcutCloseWindowAndShowConnections()

render(<Settings />)
