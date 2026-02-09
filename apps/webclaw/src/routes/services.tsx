import { createFileRoute } from '@tanstack/react-router'
import { ServicesScreen } from '../screens/services/services-screen'

export const Route = createFileRoute('/services')({
  component: ServicesRoute,
})

function ServicesRoute() {
  return <ServicesScreen />
}
