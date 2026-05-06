import { shortcutCloseWindowAndShowConnections } from '../../hooks/use-shortcut'
import { render } from '../../utils/init'
import { Activate } from './activate'

shortcutCloseWindowAndShowConnections()

render(<Activate />)
