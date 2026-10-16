import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { BookingsAdmin } from './admin-bookings';

/** Society booking management — shares the detail view and actions with Admin > Bookings. */
export const Route = createFileRoute("/society-bookings")({ head: () => pageHead("Society Bookings"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><BookingsAdmin onNavigate={onNavigate} /></PageFrame>; }
