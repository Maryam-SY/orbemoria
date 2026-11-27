import type { RouteObject } from 'react-router'
import { ExplorePage } from '@/pages/ExplorePage'
import { Layout } from './Layout'
import { AboutPage, ArPage, DestinationPage, MachinePage, NotFoundPage, StoryPage } from './lazyPages'
import { RouteErrorPage } from './RouteErrorPage'

/** Route table — keep in sync with ARCHITECTURE.md §4 and `paths.ts`. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <ExplorePage /> },
      { path: 'explore/:destinationId', element: <DestinationPage /> },
      { path: 'explore/:destinationId/:machineId', element: <MachinePage /> },
      { path: 'ar/:destinationId/:machineId', element: <ArPage /> },
      { path: 'stories/:storyId', element: <StoryPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
