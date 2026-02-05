import { createFileRoute } from '@tanstack/react-router'
import { FileExplorerScreen } from '../screens/files/file-explorer-screen'

export const Route = createFileRoute('/files')({
  component: FilesRoute,
})

function FilesRoute() {
  return <FileExplorerScreen />
}