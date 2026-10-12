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
- The RoomVAR UI is a single self-contained file (public/roomvar.html, copied to Files as index.html); the TanStack app only hosts it plus /api/public/chat and /api/public/image, which verify the user's session token themselves — the user requires a single deployable HTML file.
