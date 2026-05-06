import { Edge, Node } from '@xyflow/react'
import Elk, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk-api'

export const addLayoutedPosition = async (nodes: Node[], edges: Edge[]) => {
    if (nodes.length === 0) {
        return
    }

    const worker = new Worker(new URL('elkjs/lib/elk-worker.js', import.meta.url))
    const elk = new Elk({
        workerFactory: () => worker
    })

    const elkNodes: ElkNode[] = []
    const elkEdges: ElkExtendedEdge[] = []
    nodes.forEach((node) => {
        elkNodes.push({
            id: node.id,
            width: node.width! + 30,
            height: node.height! + 30
        })
    })
    edges.forEach((edge) => {
        elkEdges.push({
            id: edge.id,
            targets: [edge.target],
            sources: [edge.source]
        })
    })

    try {
        const layout = await elk.layout({
            id: 'root',
            children: elkNodes,
            edges: elkEdges
        })
        worker.terminate()
        layout.children?.forEach((node, i) => {
            nodes[i].position.x = (node.x ?? 0) + 38
            nodes[i].position.y = (node.y ?? 0) + 38
        })
    } catch (_) {
        worker.terminate()
    }
}
