<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep imported app screens as TanStack file routes and shared domain logic under src/lib/manzil; this preserves deep links without a second router.
- Place global auth and comparison providers in the root route so navigation preserves session and selected properties.
- Treat reference/source-schema.sql as reference only; never execute it automatically against an existing database.
- Use semantic design tokens in src/styles.css for imported and new UI, and use the shared Button component for controls.
- Never send private AI provider keys from the browser; retain local assistance until a secure server integration is configured.
- Centralize imported page role checks in the shared access module; this keeps all original role boundaries consistent across deep links.
