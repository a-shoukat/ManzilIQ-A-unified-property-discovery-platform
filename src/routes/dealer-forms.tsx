import { Outlet, createFileRoute } from '@tanstack/react-router';

/** Layout for /dealer-forms/* — child routes render the page chrome. */
export const Route = createFileRoute('/dealer-forms')({
  component: () => <Outlet />,
});
