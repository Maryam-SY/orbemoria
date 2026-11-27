import { lazy } from 'react'

/**
 * Pages fetched when first visited (performance audit, NFR-PERF-002): only the home page ships
 * in the first bundle. Kept apart from the route table so React Fast Refresh keeps working.
 */
export const DestinationPage = lazy(() => import('@/pages/DestinationPage').then((m) => ({ default: m.DestinationPage })))
export const MachinePage = lazy(() => import('@/pages/MachinePage').then((m) => ({ default: m.MachinePage })))
export const ArPage = lazy(() => import('@/pages/ArPage').then((m) => ({ default: m.ArPage })))
export const StoryPage = lazy(() => import('@/pages/StoryPage').then((m) => ({ default: m.StoryPage })))
export const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })))
export const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
