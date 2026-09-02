import { redirect } from "next/navigation";

// The feed lives at "/" now. This route stays behind as a redirect so links
// already out in the world — shared URLs, bookmarks, the installed app's old
// start_url — still land on it rather than 404.
export default function MainRedirect() {
  redirect("/");
}
