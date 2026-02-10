import { createFileRoute } from '@tanstack/react-router'
import { BotsScreen } from '../screens/bots/bots-screen'

export const Route = createFileRoute('/bots')({
  component: BotsRoute,
})

function BotsRoute() {
  return <BotsScreen />
}
