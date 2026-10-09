import { DefaultChannelSlug } from "@/app/config";

// channel 只允許 slug（英數與連字號）。任何其他字元（`/`、`\`、`.`、`:`、空白…）一律退回預設 channel，
// 讓用它組出來的導向路徑永遠是同站的 `/<slug>/...`。
const CHANNEL_SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/i;

export function safeChannel(raw: string | null | undefined): string {
	return raw && CHANNEL_SLUG.test(raw) ? raw : DefaultChannelSlug;
}
